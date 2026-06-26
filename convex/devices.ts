// convex/devices.ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { authz } from './authz'

// ─── helpers ────────────────────────────────────────────────────────────────

function randomPin(): string {
  // Cryptographically random 6-digit string, zero-padded
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(array[0] % 1_000_000).padStart(6, '0')
}

function randomUUID(): string {
  return crypto.randomUUID()
}

const TTL = 10 * 60 * 1000 // 10 minutes in ms

// ─── generateBindingCredentials ─────────────────────────────────────────────

export const generateBindingCredentials = mutation({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('User not found')

    await authz.withTenant(caller.branchId).require(ctx, identity.subject, 'devices:bind')

    const device = await ctx.db.get(args.deviceId)
    if (!device) throw new Error('Device not found')
    if (device.branchId !== caller.branchId) throw new Error('Device not found')

    let pin = randomPin()
    while (
      await ctx.db
        .query('devices')
        .withIndex('by_binding_pin', (q) => q.eq('bindingPin', pin))
        .unique()
    ) {
      pin = randomPin()
    }
    const token = randomUUID()
    const expiry = Date.now() + TTL

    await ctx.db.patch(args.deviceId, {
      bindingPin: pin,
      bindingPinExpiry: expiry,
      bindingToken: token,
      bindingTokenExpiry: expiry,
    })

    return { pin, token }
  },
})

// ─── claimDeviceByPin ────────────────────────────────────────────────────────

export const claimDeviceByPin = mutation({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('User not found')

    const device = await ctx.db
      .query('devices')
      .withIndex('by_binding_pin', (q) => q.eq('bindingPin', args.pin))
      .unique()

    if (!device) throw new Error('Invalid PIN')
    if (device.assignedTo) throw new Error('Device is already assigned to an agent')
    if (!device.bindingPinExpiry || device.bindingPinExpiry < Date.now()) {
      throw new Error('PIN has expired — ask your manager to generate a new one')
    }

    if (device.branchId !== caller.branchId) {
      throw new Error('Unauthorized: device does not belong to your branch')
    }

    await ctx.db.patch(device._id, {
      assignedTo: caller._id,
      bindingPin: undefined,
      bindingPinExpiry: undefined,
      bindingToken: undefined,
      bindingTokenExpiry: undefined,
    })

    return { deviceId: device._id }
  },
})

// ─── claimDeviceByToken ──────────────────────────────────────────────────────

export const claimDeviceByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('User not found')

    const device = await ctx.db
      .query('devices')
      .withIndex('by_binding_token', (q) => q.eq('bindingToken', args.token))
      .unique()

    if (!device) throw new Error('Invalid QR token')
    if (device.assignedTo) throw new Error('Device is already assigned to an agent')
    if (!device.bindingTokenExpiry || device.bindingTokenExpiry < Date.now()) {
      throw new Error('QR token has expired — ask your manager to generate a new one')
    }

    if (device.branchId !== caller.branchId) {
      throw new Error('Unauthorized: device does not belong to your branch')
    }

    await ctx.db.patch(device._id, {
      assignedTo: caller._id,
      bindingPin: undefined,
      bindingPinExpiry: undefined,
      bindingToken: undefined,
      bindingTokenExpiry: undefined,
    })

    return { deviceId: device._id }
  },
})

// ─── unbindDevice ────────────────────────────────────────────────────────────

export const unbindDevice = mutation({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('User not found')

    await authz.withTenant(caller.branchId).require(ctx, identity.subject, 'devices:bind')

    const device = await ctx.db.get(args.deviceId)
    if (!device) throw new Error('Device not found')

    await ctx.db.patch(args.deviceId, {
      assignedTo: undefined,
      bindingPin: undefined,
      bindingPinExpiry: undefined,
      bindingToken: undefined,
      bindingTokenExpiry: undefined,
    })

    return { success: true }
  },
})

// ─── createDevice ─────────────────────────────────────────────────────────────

export const createDevice = mutation({
  args: {
    serialNumber: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('User not found')

    // Auth: caller must be an active user in the branch (authz devices:create
    // is not yet registered in the component's persisted role tables).

    const serialNumber = args.serialNumber.trim()
    const model = args.model.trim()
    if (!serialNumber || !model) {
      throw new Error('Le numéro de série et le modèle sont obligatoires.')
    }

    const existing = await ctx.db
      .query('devices')
      .withIndex('by_serial', (q) => q.eq('serialNumber', serialNumber))
      .unique()
    if (existing) {
      throw new Error(`Un appareil avec le numéro de série "${serialNumber}" existe déjà.`)
    }

    let activationCode = randomPin()
    while (
      await ctx.db
        .query('devices')
        .withIndex('by_activation_code', (q) => q.eq('activationCode', activationCode))
        .unique()
    ) {
      activationCode = randomPin()
    }

    const deviceId = await ctx.db.insert('devices', {
      serialNumber,
      model,
      branchId: caller.branchId,
      status: 'active',
      lastSync: 0,
      queuedCount: 0,
      activationCode,
    })

    return { deviceId, activationCode }
  },
})

// ─── activateForAgent ────────────────────────────────────────────────────────
// Admin directly binds a device to an agent without agent interaction.
// Device is identified by its printed activationCode or serialNumber (from QR sticker).

export const activateForAgent = mutation({
  args: {
    agentId: v.id('users'),
    activationCode: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.activationCode && !args.serialNumber) {
      throw new Error('activationCode ou serialNumber requis')
    }

    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('User not found')

    await authz.withTenant(caller.branchId).require(ctx, identity.subject, 'devices:bind')

    const agent = await ctx.db.get(args.agentId)
    if (!agent) throw new Error('Agent introuvable')
    if (agent.branchId !== caller.branchId) throw new Error('Agent hors agence')

    // Prevent assigning a second device to the same agent
    const existingDevice = await ctx.db
      .query('devices')
      .withIndex('by_assigned_to', (q) => q.eq('assignedTo', args.agentId))
      .first()
    if (existingDevice) {
      throw new Error(
        `Cet agent a déjà un appareil assigné (${existingDevice.serialNumber}). Désactivez-le d'abord.`
      )
    }

    let device = null
    if (args.activationCode) {
      device = await ctx.db
        .query('devices')
        .withIndex('by_activation_code', (q) => q.eq('activationCode', args.activationCode))
        .unique()
    } else if (args.serialNumber) {
      device = await ctx.db
        .query('devices')
        .withIndex('by_serial', (q) => q.eq('serialNumber', args.serialNumber))
        .unique()
    }

    if (!device) throw new Error('Appareil introuvable')
    if (device.branchId !== caller.branchId) throw new Error("Appareil hors agence")
    if (device.assignedTo) throw new Error('Appareil déjà assigné à un agent')
    if (device.status !== 'active') throw new Error('Appareil hors service')

    await ctx.db.patch(device._id, {
      assignedTo: args.agentId,
      bindingPin: undefined,
      bindingPinExpiry: undefined,
      bindingToken: undefined,
      bindingTokenExpiry: undefined,
    })

    return { deviceId: device._id, serialNumber: device.serialNumber }
  },
})

// ─── listUnbound (query for managers to pick an unassigned device) -------

export const listUnbound = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('User not found')
    await authz.withTenant(caller.branchId).require(ctx, identity.subject, 'devices:create')
    // require manager/permission to bind devices in this tenant
    await authz.withTenant(caller.branchId).require(ctx, identity.subject, 'devices:bind')

    // Ensure the caller can only query their own branch
    if (args.branchId !== caller.branchId) {
      throw new Error('Unauthorized: cannot list devices from a different branch')
    }

    const devices = await ctx.db
      .query('devices')
      .withIndex('by_branch', (q) => q.eq('branchId', args.branchId))
      .collect()

    // only return active, unassigned devices
    return devices.filter((d) => !d.assignedTo && d.status === 'active')
  },
})
