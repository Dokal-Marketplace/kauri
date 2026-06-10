// convex/seedDevices.ts
// Dev-only — insère 3 TPE non-assignés dans la branche de l'utilisateur connecté
// Appeler depuis la Convex dashboard ou un bouton admin temporaire

import { mutation } from './_generated/server'

export const seedDevicesForBranch = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    // Retrouver l'utilisateur connecté pour avoir son branchId
    const caller = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!caller) throw new Error('User not found')

    const branchId = caller.branchId

    // Vérifier que la branche existe
    const branch = await ctx.db.get(branchId)
    if (!branch) throw new Error('Branch not found')

    // Eviter les doublons sur serialNumber
    const existing = await ctx.db
      .query('devices')
      .withIndex('by_serial', (q) => q.eq('serialNumber', 'TPE-SEED-001'))
      .unique()
    if (existing) {
      return { skipped: true, message: 'Devices déjà seedés pour cette session' }
    }

    const now = Date.now()

    const d1 = await ctx.db.insert('devices', {
      serialNumber: 'TPE-SEED-001',
      model: 'Ingenico iWL250',
      branchId,
      status: 'active',
      lastSync: now - 1000 * 60 * 15, // 15 min ago
      batteryPct: 87,
      signalLevel: 4,
      queuedCount: 0,
    })

    const d2 = await ctx.db.insert('devices', {
      serialNumber: 'TPE-SEED-002',
      model: 'PAX A920',
      branchId,
      status: 'active',
      lastSync: now - 1000 * 60 * 60 * 2, // 2 h ago
      batteryPct: 54,
      signalLevel: 3,
      queuedCount: 0,
    })

    const d3 = await ctx.db.insert('devices', {
      serialNumber: 'TPE-SEED-003',
      model: 'Ingenico iWL250',
      branchId,
      status: 'active',
      lastSync: now - 1000 * 60 * 30, // 30 min ago
      batteryPct: 72,
      signalLevel: 5,
      queuedCount: 0,
    })

    return {
      skipped: false,
      branchId,
      branchName: branch.name,
      devices: [d1, d2, d3],
    }
  },
})
