import { query } from './_generated/server'
import { v } from 'convex/values'
import { authz } from './authz'

export const listByCustomer = query({
  args: {
    customerId: v.id('customers'),
    limit:      v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    // Résoudre l'agent appelant
    const agent = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!agent) throw new Error('Agent not found')

    // Charger le client et vérifier qu'il appartient à la même branche
    const customer = await ctx.db.get(args.customerId)
    if (!customer) throw new Error('Customer not found')
    if (customer.branchId !== agent.branchId) throw new Error('Unauthorized')

    const rows = await ctx.db
      .query('transactions')
      .withIndex('by_branch', q => q.eq('branchId', agent.branchId))
      .filter(q => q.eq(q.field('customerId'), args.customerId))
      .order('desc')
      .take(args.limit ?? 10)

    return Promise.all(
      rows.map(async t => {
        const agentRecord = await ctx.db.get(t.agentId)
        return {
          ...t,
          agentName: agentRecord?.fullName ?? '—',
        }
      })
    )
  },
})
