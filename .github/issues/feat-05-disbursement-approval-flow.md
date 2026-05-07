---
title: "[Feature] Build disbursement approval UI wired to Convex maker-checker flow"
labels: feature, convex, frontend
priority: high
---

## Description

`convex/disbursements.ts` has an `approveDisbursement` mutation implementing a maker-checker workflow with a self-approval fraud check. There is no frontend page or component for this flow — disbursements are invisible in the current UI.

## Tasks

### 1. Add missing mutations to `convex/disbursements.ts`

The existing file only has `approveDisbursement`. Add:

```ts
export const requestDisbursement = mutation({
  args: {
    amount: v.number(),
    customerId: v.id('customers'),
    payoutMethod: v.union(v.literal('cash'), v.literal('mobile_money')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    await authz.require(ctx, identity.subject, 'disbursements:request')
    const agent = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!agent) throw new Error('Agent not found')
    return ctx.db.insert('disbursements', {
      amount: args.amount,
      customerId: args.customerId,
      branchId: agent.branchId,
      initiatedBy: agent._id,
      status: 'pending',
      payoutMethod: args.payoutMethod,
      timestamp: Date.now(),
    })
  },
})

export const listPending = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    return ctx.db
      .query('disbursements')
      .withIndex('by_status', q => q.eq('status', 'pending'))
      .filter(q => q.eq(q.field('branchId'), args.branchId))
      .collect()
  },
})

export const rejectDisbursement = mutation({
  args: { disbursementId: v.id('disbursements'), reason: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    await authz.require(ctx, identity.subject, 'disbursements:approve')
    return ctx.db.patch(args.disbursementId, { status: 'rejected' })
  },
})
```

### 2. Add a DisbursementsPage

Create `src/pages/DisbursementsPage.jsx` with:
- A KPI row: pending count, total pending amount, approved today, rejected today.
- A table of pending disbursements with Approuver / Rejeter action buttons.
- The approve button calls `approveDisbursement`; self-approval is blocked backend-side and should surface a clear error message in the UI.
- A history tab showing all `approved` / `rejected` / `executed` disbursements.

### 3. Register the page in App.jsx

```jsx
import DisbursementsPage from './pages/DisbursementsPage'
const PAGES = {
  // ...existing pages
  decaissements: DisbursementsPage,
}
```

Add a "Décaissements" entry to the Sidebar nav under the "Principal" group.

### 4. Add a pending-disbursements badge to the sidebar

Show the count of pending disbursements (from `listPending`) as a badge on the sidebar nav item, similar to the existing "12" badge on Transactions.

## Acceptance Criteria

- [ ] Supervisor can see all pending disbursements for their branch.
- [ ] Approving a disbursement they initiated throws "Fraud Prevention" and shows the error in the UI.
- [ ] A different supervisor can approve and the record updates to `approved` in real time.
- [ ] Field agent cannot access the approve/reject actions (permission gated in UI and backend).
- [ ] Rejected disbursements show a reason in the history view.
