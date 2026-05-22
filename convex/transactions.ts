import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { authz } from './authz'
import { QueryCtx, MutationCtx } from './_generated/server'

// Helpers
async function resolveAgent(ctx: QueryCtx | MutationCtx, subject: string) {
  const agent = await ctx.db
    .query('users')
    .withIndex('by_token', q => q.eq('tokenIdentifier', subject))
    .unique()
  if (!agent) throw new Error('Agent not found')
  return agent
}

// Queries
export const listByCustomer = query({
  args: {
    customerId: v.id('customers'),
    limit:      v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    // Résoudre l'agent appelant
    const agent = await resolveAgent(ctx, identity.subject)


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

// T1 + T5 — liste branche avec filtre date server-side
export const listByBranch = query({
  args: {
    from: v.optional(v.number()),
    to:   v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const agent = await resolveAgent(ctx, identity.subject)

    await authz
      .withTenant(agent.branchId)
      .require(ctx, identity.subject, 'transactions:audit')

    let rows = await ctx.db
      .query('transactions')
      .withIndex('by_branch', (q: any) => q.eq('branchId', agent.branchId))
      .order('desc')
      .collect()

    // Filtres date en mémoire (Convex ne chaîne pas les range filters sur index composite)
    if (args.from) rows = rows.filter(t => t.timestamp >= args.from!)
    if (args.to)   rows = rows.filter(t => t.timestamp <= args.to!)

    return Promise.all(rows.map(async t => {
      const agentRecord = await ctx.db.get(t.agentId)
      const customer    = await ctx.db.get(t.customerId)
      return {
        ...t,
        agentName:    agentRecord?.fullName ?? '—',
        customerName: customer?.fullName    ?? '—',
      }
    }))
  },
})

// ─── Mutations ───────────────────────────────────────────────────────────────

// T1 — collecte de cash
export const collectCash = mutation({
  args: {
    customerId: v.id('customers'),
    amount:     v.number(),
    tpeId:      v.string(),
    currency:   v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const agent = await resolveAgent(ctx, identity.subject)

    await authz
      .withTenant(agent.branchId)
      .require(ctx, identity.subject, 'transactions:collect')

    const customer = await ctx.db.get(args.customerId)
    if (!customer) throw new Error('Customer not found')
    if (customer.branchId !== agent.branchId) throw new Error('Unauthorized')

    return ctx.db.insert('transactions', {
      amount:     args.amount,
      currency:   args.currency ?? 'XOF',
      customerId: args.customerId,
      agentId:    agent._id,
      branchId:   agent.branchId,
      tpeId:      args.tpeId,
      status:     'pending',
      timestamp:  Date.now(),
    })
  },
})

// T2 — valider une transaction pending
export const validateTransaction = mutation({
  args: { transactionId: v.id('transactions') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const agent = await resolveAgent(ctx, identity.subject)

    await authz
      .withTenant(agent.branchId)
      .require(ctx, identity.subject, 'transactions:audit')

    const tx = await ctx.db.get(args.transactionId)
    if (!tx) throw new Error('Transaction not found')
    if (tx.branchId !== agent.branchId) throw new Error('Unauthorized')
    if (tx.status !== 'pending') throw new Error('Only pending transactions can be validated')

    return ctx.db.patch(args.transactionId, { status: 'completed' })
  },
})

// T3 — annulation avec raison
export const reverseTransaction = mutation({
  args: {
    transactionId: v.id('transactions'),
    reason:        v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const agent = await resolveAgent(ctx, identity.subject)

    await authz
      .withTenant(agent.branchId)
      .require(ctx, identity.subject, 'transactions:reverse')

    const tx = await ctx.db.get(args.transactionId)
    if (!tx) throw new Error('Transaction not found')
    if (tx.branchId !== agent.branchId) throw new Error('Unauthorized')
    if (tx.status === 'reversed') throw new Error('Already reversed')

    // Vérifier qu'aucune réconciliation settled ne couvre cette transaction
    const reconciled = await ctx.db
      .query('reconciliations')
      .withIndex('by_branch_status', (q: any) =>
        q.eq('branchId', agent.branchId).eq('status', 'settled')
      )
      .filter((q: any) =>
        q.and(
          q.lte(q.field('timestamp'), tx.timestamp),
          q.gte(q.field('timestamp'), tx.timestamp)
        )
      )
      .first()
    if (reconciled) throw new Error('Transaction already reconciled — reversal blocked')

    return ctx.db.patch(args.transactionId, {
      status:         'reversed',
      reversalReason: args.reason,
      reversedBy:     agent._id,
    })
  },
})
