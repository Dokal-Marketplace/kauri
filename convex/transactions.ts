import { query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Recent transactions for a given customer, newest first.
 * Enriched with the agent's full name.
 */
export const listByCustomer = query({
  args: {
    customerId: v.id('customers'),
    limit:      v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const rows = await ctx.db
      .query('transactions')
      .filter(q => q.eq(q.field('customerId'), args.customerId))
      .order('desc')
      .take(args.limit ?? 10)

    return Promise.all(
      rows.map(async t => {
        const agent = await ctx.db.get(t.agentId)
        return {
          ...t,
          agentName: agent?.fullName ?? '—',
        }
      })
    )
  },
})
