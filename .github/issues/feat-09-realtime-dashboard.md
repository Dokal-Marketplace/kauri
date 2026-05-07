---
title: "[Feature] Wire DashboardPage KPIs and charts to live Convex aggregates"
labels: feature, convex, frontend
priority: medium
---

## Description

`src/pages/DashboardPage.jsx` renders `KPIS`, `CLIENTS`, `TRANSACTIONS`, `VOLUME`, `GOALS`, and `FEED` — all from static mock data. The dashboard is the primary real-time view for branch supervisors and should reflect live data via Convex reactive queries.

## Tasks

### 1. Add a `convex/dashboard.ts` aggregates query

Rather than making 5 separate queries in the component (which causes waterfall loading), expose a single denormalized query that returns everything the dashboard needs:

```ts
export const branchSummary = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const today = new Date().toISOString().split('T')[0]
    const startOfMonth = today.slice(0, 7) + '-01'

    const [customers, transactions, goals] = await Promise.all([
      ctx.db.query('customers')
        .withIndex('by_status')
        .filter(q => q.eq(q.field('branchId'), args.branchId))
        .collect(),
      ctx.db.query('transactions')
        .withIndex('by_branch', q => q.eq('branchId', args.branchId))
        .order('desc')
        .take(100),
      ctx.db.query('savingsGoals')
        .withIndex('by_branch_status', q => q.eq('branchId', args.branchId))
        .collect(),
    ])

    const activeClients     = customers.filter(c => c.status === 'verified').length
    const monthlyTx         = transactions.filter(t => t.timestamp >= new Date(startOfMonth).getTime())
    const totalSavings      = monthlyTx.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0)
    const recentTx          = transactions.slice(0, 6)
    const topGoals          = goals.sort((a, b) => b.pct - a.pct).slice(0, 4)

    return { activeClients, totalSavings, recentTx, topGoals, monthlyTx }
  },
})
```

### 2. Wire DashboardPage to the query

```jsx
export default function DashboardPage() {
  const branchId = useCurrentBranch()
  const summary  = useQuery(api.dashboard.branchSummary, { branchId })

  if (!summary) return <DashboardSkeleton />

  return (
    <>
      <Topbar ... />
      <section className="kpi-row">
        <KPI label="Clients actifs"  value={summary.activeClients} ... />
        <KPI label="Épargne totale"  value={summary.totalSavings}  ... />
        {/* etc. */}
      </section>
      <VolumeChart data={summary.monthlyVolume} />
      <ClientsCard clients={summary.recentClients} />
      <TransactionsCard tx={summary.recentTx} />
      <GoalsCard goals={summary.topGoals} />
    </>
  )
}
```

### 3. Add loading skeletons

Replace the current all-or-nothing render with skeleton placeholders while `summary` is `undefined` (first load). Use CSS animated placeholders matching the existing card shapes.

### 4. Add a monthly volume aggregation

The `VolumeChart` needs `{ m: string, in: number, out: number }[]` grouped by month. Add a helper in `dashboard.ts` that groups the last 12 months of transactions by month.

### 5. Wire the activity feed to real events

Replace the static `FEED` array with the 10 most recent `transactions` and `reconciliations` joined with user/customer names.

## Acceptance Criteria

- [ ] KPIs update in real time when a new transaction is recorded (Convex reactive query).
- [ ] Dashboard renders a skeleton while data loads — no flash of mock data.
- [ ] Volume chart shows real monthly totals.
- [ ] Recent transactions card links to the full TransactionsPage (already done via nav).
- [ ] Activity feed shows real events, not hardcoded strings.
