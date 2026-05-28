// convex/goals.ts
import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute days remaining until an ISO-date deadline (YYYY-MM-DD). */
function daysUntil(deadline: string): number {
  const now = Date.now()
  const end = new Date(deadline).getTime()
  return Math.round((end - now) / 86_400_000)
}

/** Derive status from progress % and days remaining. */
function deriveStatus(
  pct: number,
  daysLeft: number
): 'atteint' | 'enretard' | 'encours' {
  if (pct >= 100) return 'atteint'
  if (daysLeft < 21 && pct < 80) return 'enretard'
  return 'encours'
}

// ---------------------------------------------------------------------------
// listByBranch — returns goals enriched with live currentAmount + pct
// ---------------------------------------------------------------------------

export const listByBranch = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const goals = await ctx.db
      .query('savingsGoals')
      .withIndex('by_branch_status', (q) => q.eq('branchId', args.branchId))
      .collect()

    // Enrich each goal with the sum of the customer's completed transactions.
    return Promise.all(
      goals.map(async (g) => {
        const txs = await ctx.db
          .query('transactions')
          .filter((q) =>
            q.and(
              q.eq(q.field('customerId'), g.customerId),
              q.eq(q.field('status'), 'completed')
            )
          )
          .collect()

        const currentAmount = txs.reduce((s, t) => s + t.amount, 0)
        const pct = g.targetAmount > 0 ? Math.round((currentAmount / g.targetAmount) * 100) : 0
        const daysLeft = daysUntil(g.deadline)

        return { ...g, currentAmount, pct, daysLeft }
      })
    )
  },
})

// ---------------------------------------------------------------------------
// create — field agents create new savings goals
// ---------------------------------------------------------------------------

export const create = mutation({
  args: {
    customerId: v.id('customers'),
    category: v.string(),
    productCode: v.string(),
    targetAmount: v.number(),
    deadline: v.string(), // ISO date YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    if (args.targetAmount <= 0) throw new Error('targetAmount must be greater than 0')

    const agent = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!agent) throw new Error('Agent not found')

    if (args.targetAmount <= 0) throw new Error('targetAmount must be greater than 0')

    if (isNaN(deadlineMs) || deadlineMs <= Date.now()) {
      throw new Error('deadline must be a valid date in the future')
    }

    // Verify customer belongs to agent's branch
    const customer = await ctx.db.get(args.customerId)
    if (!customer || customer.branchId !== agent.branchId) {
      throw new Error('Unauthorized: Customer does not belong to your branch')
    }

    return ctx.db.insert('savingsGoals', {
      ...args,
      branchId: agent.branchId,
      agentId: agent._id,
      status: 'encours',
      createdAt: Date.now(),
    })
  },
})

// ---------------------------------------------------------------------------
// refreshStatuses — internal mutation called by the daily cron
// ---------------------------------------------------------------------------

export const refreshStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const goals = await ctx.db.query('savingsGoals').collect()

    await Promise.all(
      goals.map(async (g) => {
        // Skip goals that are paused — don't override a manual pause
        if (g.status === 'enpause') return

        const txs = await ctx.db
          .query('transactions')
          .filter((q) =>
            q.and(
              q.eq(q.field('customerId'), g.customerId),
              q.eq(q.field('status'), 'completed')
            )
          )
          .collect()

        const currentAmount = txs.reduce((s, t) => s + t.amount, 0)
        const pct = g.targetAmount > 0 ? Math.round((currentAmount / g.targetAmount) * 100) : 0
        const daysLeft = daysUntil(g.deadline)
        const newStatus = deriveStatus(pct, daysLeft)

        if (newStatus !== g.status) {
          await ctx.db.patch(g._id, { status: newStatus })
        }
      })
    )
  },
})
