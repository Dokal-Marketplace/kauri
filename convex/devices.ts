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

    const deviceId = await ctx.db.insert('devices', {
      serialNumber,
      model,
      branchId: caller.branchId,
      status: 'active',
      lastSync: 0,
      queuedCount: 0,
    })

    return { deviceId }
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

// Assignation manuelle par l'admin
export const assignDeviceToAgent = mutation({
  args: {
    deviceId: v.id('devices'),
    agentId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Non authentifié')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('Utilisateur introuvable')

    await authz.withTenant(caller.branchId).require(ctx, identity.subject, 'devices:bind')

    const device = await ctx.db.get(args.deviceId)
    const agent = await ctx.db.get(args.agentId)

    if (!device || !agent) throw new Error('Appareil ou agent introuvable')
    if (device.branchId !== caller.branchId) throw new Error('Unauthorized')
    if (agent.branchId !== caller.branchId) throw new Error('Unauthorized')

    // Désassigner l'ancien agent si le TPE était déjà assigné
    if (device.assignedTo && device.assignedTo !== args.agentId) {
      // Optionnel : notifier l'ancien agent
    }

    await ctx.db.patch(args.deviceId, {
      assignedTo: args.agentId,
      // Nettoyer les credentials de binding
      bindingPin: undefined,
      bindingPinExpiry: undefined,
      bindingToken: undefined,
      bindingTokenExpiry: undefined,
    })

    return { success: true }
  },
})

// Désassigner un TPE
export const unassignDevice = mutation({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Non authentifié')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('Utilisateur introuvable')

    await authz.withTenant(caller.branchId).require(ctx, identity.subject, 'devices:bind')

    const device = await ctx.db.get(args.deviceId)
    if (!device || device.branchId !== caller.branchId) {
      throw new Error('Appareil introuvable')
    }

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

// ── generateRegistrationCredentials ─────────────────────────────────────────
export const generateRegistrationCredentials = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('User not found')

    await authz.withTenant(caller.branchId).require(ctx, identity.subject, 'devices:create')

    const token = randomUUID()
    const pin = randomPin()
    const expiry = Date.now() + TTL

    const registrationId = await ctx.db.insert('deviceRegistrations', {
      branchId: caller.branchId,
      token,
      pin,
      expiresAt: expiry,
      status: 'pending',
    })

    return { registrationId, token, pin, expiresAt: expiry }
  },
})

// ─── registerDeviceByToken ───────────────────────────────────────────────────
export const registerDeviceByToken = mutation({
  args: {
    token: v.string(),
    serialNumber: v.string(),
    model: v.string(),
    brand: v.optional(v.string()),
    batteryPct: v.optional(v.number()),
    registrationLocation: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        accuracy: v.optional(v.number()),
        timestamp: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query('deviceRegistrations')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique()

    if (!registration) throw new Error('Token invalide')
    if (registration.status !== 'pending') throw new Error('Token déjà utilisé')
    if (registration.expiresAt < Date.now()) {
      await ctx.db.patch(registration._id, { status: 'expired' })
      throw new Error('Token expiré')
    }

    const existing = await ctx.db
      .query('devices')
      .withIndex('by_serial', (q) => q.eq('serialNumber', args.serialNumber))
      .unique()
    if (existing) throw new Error('Ce numéro de série existe déjà')

    const now = Date.now()
    const deviceId = await ctx.db.insert('devices', {
      serialNumber: args.serialNumber.trim().toUpperCase(),
      model: args.model.trim(),
      brand: args.brand?.trim(),
      branchId: registration.branchId,
      status: 'active',
      lastSync: now,
      batteryPct: args.batteryPct,
      registrationLocation: args.registrationLocation,
      registrationDate: now,
      queuedCount: 0,
    })

    await ctx.db.patch(registration._id, {
      status: 'completed',
      deviceId,
    })

    return { deviceId }
  },
})

// ─── registerDeviceByPin ─────────────────────────────────────────────────────
export const registerDeviceByPin = mutation({
  args: {
    pin: v.string(),
    serialNumber: v.string(),
    model: v.string(),
    brand: v.optional(v.string()),
    batteryPct: v.optional(v.number()),
    registrationLocation: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        accuracy: v.optional(v.number()),
        timestamp: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query('deviceRegistrations')
      .withIndex('by_pin', (q) => q.eq('pin', args.pin))
      .unique()

    if (!registration) throw new Error('PIN invalide')
    if (registration.status !== 'pending') throw new Error('PIN déjà utilisé')
    if (registration.expiresAt < Date.now()) {
      await ctx.db.patch(registration._id, { status: 'expired' })
      throw new Error('PIN expiré')
    }

    const existing = await ctx.db
      .query('devices')
      .withIndex('by_serial', (q) => q.eq('serialNumber', args.serialNumber))
      .unique()
    if (existing) throw new Error('Ce numéro de série existe déjà')

    const now = Date.now()
    const deviceId = await ctx.db.insert('devices', {
      serialNumber: args.serialNumber.trim().toUpperCase(),
      model: args.model.trim(),
      branchId: registration.branchId,
      status: 'active',
      lastSync: Date.now(),
      batteryPct: args.batteryPct,
      registrationLocation: args.registrationLocation,
      registrationDate: now,
      queuedCount: 0,
    })

    await ctx.db.patch(registration._id, {
      status: 'completed',
      deviceId,
    })

    return { deviceId }
  },
})

// ─── checkRegistrationStatus ─────────────────────────────────────────────────
export const checkRegistrationStatus = query({
  args: { registrationId: v.id('deviceRegistrations') },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId)
    if (!registration) return { status: 'not_found' }

    if (registration.status === 'completed' && registration.deviceId) {
      const device = await ctx.db.get(registration.deviceId)
      return {
        status: 'completed',
        device: device
          ? {
              _id: device._id,
              serialNumber: device.serialNumber,
              model: device.model,
            }
          : null,
      }
    }

    if (registration.expiresAt < Date.now() && registration.status === 'pending') {
      return { status: 'expired' } // Juste retourner le statut calculé
    }

    return { status: registration.status }
  },
})

// Ajouter à la fin de convex/devices.ts
export const listByBranch = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('User not found')

    // Vérifier que l'utilisateur a accès à cette branche
    if (caller.branchId !== args.branchId) {
      throw new Error('Unauthorized')
    }

    const devices = await ctx.db
      .query('devices')
      .withIndex('by_branch', (q) => q.eq('branchId', args.branchId))
      .collect()

    return devices
  },
})

// ─── getBySerial ─────────────────────────────────────────────────────────────
// Query publique : permet de vérifier si un TPE existe déjà dans le système
// avant même que l'utilisateur soit connecté (utilisé sur l'écran de login)
export const getBySerial = query({
  args: { serialNumber: v.string() },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query('devices')
      .withIndex('by_serial', (q) => q.eq('serialNumber', args.serialNumber.trim().toUpperCase()))
      .unique()

    return device ?? null
  },
})
