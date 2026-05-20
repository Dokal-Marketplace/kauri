import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { authz } from './authz'

export const listByBranch = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    const users = await ctx.db
      .query('users')
      .withIndex('by_branch', q => q.eq('branchId', args.branchId))
      .collect()
    // Join each user with their assigned device
    return Promise.all(users.map(async u => {
      const device = await ctx.db
        .query('devices')
        .filter(q => q.eq(q.field('assignedTo'), u._id))
        .first()
      return { ...u, device }
    }))
  },
})

export const bindDevice = mutation({
  args: { userId: v.id('users'), serialNumber: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    await authz.require(ctx, identity.subject, 'devices:bind')
    const device = await ctx.db
      .query('devices')
      .withIndex('by_serial', q => q.eq('serialNumber', args.serialNumber))
      .unique()
    if (!device) throw new Error('Device not found')
    return ctx.db.patch(device._id, { assignedTo: args.userId })
  },
})
