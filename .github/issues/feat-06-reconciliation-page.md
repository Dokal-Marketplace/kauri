---
title: "[Feature] Build daily cash reconciliation page wired to settleDailyCash"
labels: feature, convex, frontend
priority: high
---

## Description

`convex/reconciliation.ts` has a `settleDailyCash` mutation but there is no UI to trigger it and no page to view reconciliation records. This is a core operational workflow for MFI branch accountants.

## Tasks

### 1. Add missing queries to `convex/reconciliation.ts`

```ts
export const listByBranch = query({
  args: { branchId: v.id('branches'), date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    await authz.require(ctx, identity.subject, 'reconciliation:liquidate')
    let q = ctx.db
      .query('reconciliations')
      .withIndex('by_branch_status', r => r.eq('branchId', args.branchId))
    return q.order('desc').collect()
  },
})

export const getAgentDailySummary = query({
  args: { agentId: v.id('users'), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    // Returns the transactions for this agent on this date for pre-check display
    const startOfDay = new Date(args.date + 'T00:00:00Z').getTime()
    const endOfDay   = new Date(args.date + 'T23:59:59Z').getTime()
    return ctx.db
      .query('transactions')
      .withIndex('by_agent_date', q => q.eq('agentId', args.agentId))
      .filter(q =>
        q.and(
          q.eq(q.field('status'), 'completed'),
          q.gte(q.field('timestamp'), startOfDay),
          q.lte(q.field('timestamp'), endOfDay)
        )
      )
      .collect()
  },
})
```

### 2. Create `src/pages/ReconciliationPage.jsx`

Key UI elements:
- **Agent selector** — dropdown of agents for the branch.
- **Pre-check panel** — shows the system-expected total (from `getAgentDailySummary`) before physical cash is entered.
- **Physical cash input** — the accountant types the actual amount handed over.
- **Variance preview** — live-computed `physical - expected` shown before confirming.
- **Confirm button** — calls `settleDailyCash`. Shows `settled` (variance = 0) or `discrepancy` outcome.
- **History table** — past reconciliations from `listByBranch` with variance highlighted in red/green.

### 3. Register the page in App.jsx and Sidebar

```jsx
import ReconciliationPage from './pages/ReconciliationPage'
const PAGES = { ..., reconciliation: ReconciliationPage }
```

Add under the "Rapports" group in the sidebar.

### 4. Block transaction reversals post-reconciliation (already in backend)

The `reverseTransaction` mutation already blocks reversals after settlement. Ensure the UI in `TxDrawer` reflects this — the "Annuler" button should be hidden or disabled with an explanatory tooltip when the day is settled.

## Acceptance Criteria

- [ ] Accountant can select any agent for their branch and see today's expected total.
- [ ] Submitting `settleDailyCash` with the correct amount marks the session as `settled`.
- [ ] A `discrepancy` shows the signed variance (red for shortage, green for overage).
- [ ] Duplicate reconciliation for the same agent/date is prevented (add unique index `by_agent_date` check in the mutation).
- [ ] After settlement, attempting to reverse a transaction from that day fails with a clear UI message.
