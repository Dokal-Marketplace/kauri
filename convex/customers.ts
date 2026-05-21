import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { authz } from './authz'

/**
 * List all customers for a branch (verified + prospect + rejected),
 * enriched with the onboarding agent's name.
 */
export const listByBranch = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    // by_branch index doesn't exist on customers — use by_status + filter,
    // or a full collect with filter. Schema only has by_phone and by_status,
    // so we filter after collecting by status groups to stay index-friendly.
    // For correctness we collect all statuses and filter by branchId.
    const customers = await ctx.db
      .query('customers')
      .collect()

    const filtered = customers.filter(c => c.branchId === args.branchId)

    return Promise.all(
      filtered.map(async c => {
        const agent = await ctx.db.get(c.onboardedBy)
        return {
          ...c,
          agentName: agent?.fullName ?? '—',
        }
      })
    )
  },
})

/**
 * Create a new prospect during field onboarding.
 * The agent's branchId is resolved server-side — clients never supply it.
 */
export const createProspect = mutation({
  args: {
    fullName:    v.string(),
    phoneNumber: v.string(),
    idNumber:    v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    // Resolve the calling agent first so we have branchId for tenant scoping
    const agent = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!agent) throw new Error('Agent not found')

    // Authorise within the agent's branch (multi-tenant guard)
    await authz
      .withTenant(agent.branchId)
      .require(ctx, identity.subject, 'customers:create_prospect')

    return ctx.db.insert('customers', {
      ...args,
      branchId:    agent.branchId,
      onboardedBy: agent._id,
      status:      'prospect',
    })
  },
})
