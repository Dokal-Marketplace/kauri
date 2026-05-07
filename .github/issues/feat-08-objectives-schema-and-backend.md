---
title: "[Feature] Add savings goals table to Convex schema and wire ObjectifsPage"
labels: feature, convex, frontend
priority: medium
---

## Description

`src/pages/ObjectifsPage.jsx` derives its data by transforming the static `CLIENTS` array with hardcoded goal amounts and deadlines (`buildObjectifs()`). There is no `goals` or `objectifs` table in `convex/schema.ts`. Savings goals are a core product feature that must be persisted and tracked over time.

## Tasks

### 1. Add a `savingsGoals` table to `convex/schema.ts`

```ts
savingsGoals: defineTable({
  customerId:   v.id('customers'),
  branchId:     v.id('branches'),
  agentId:      v.id('users'),       // responsible agent
  category:     v.string(),          // "Scolarité", "Mariage", etc.
  productCode:  v.string(),          // links to a product
  targetAmount: v.number(),
  deadline:     v.string(),          // ISO date YYYY-MM-DD
  status:       v.union(
    v.literal('encours'),
    v.literal('atteint'),
    v.literal('enretard'),
    v.literal('enpause')
  ),
  createdAt:    v.number(),
})
  .index('by_customer',       ['customerId'])
  .index('by_branch_status',  ['branchId', 'status'])
  .index('by_agent',          ['agentId']),
```

Progress (`currentAmount`, `pct`) is computed by querying the sum of the customer's completed transactions — not stored, to stay in sync automatically.

### 2. Create `convex/goals.ts`

```ts
export const listByBranch = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    const goals = await ctx.db
      .query('savingsGoals')
      .withIndex('by_branch_status', q => q.eq('branchId', args.branchId))
      .collect()
    // Enrich each goal with current balance from transactions
    return Promise.all(goals.map(async g => {
      const txs = await ctx.db
        .query('transactions')
        .filter(q =>
          q.and(
            q.eq(q.field('customerId'), g.customerId),
            q.eq(q.field('status'), 'completed')
          )
        )
        .collect()
      const current = txs.reduce((s, t) => s + t.amount, 0)
      return { ...g, currentAmount: current, pct: Math.round((current / g.targetAmount) * 100) }
    }))
  },
})

export const create = mutation({
  args: {
    customerId:   v.id('customers'),
    category:     v.string(),
    productCode:  v.string(),
    targetAmount: v.number(),
    deadline:     v.string(),
  },
  handler: async (ctx, args) => {
    // accessible to field_agent and above
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    const agent = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!agent) throw new Error('Agent not found')
    return ctx.db.insert('savingsGoals', {
      ...args,
      branchId: agent.branchId,
      agentId:  agent._id,
      status:   'encours',
      createdAt: Date.now(),
    })
  },
})
```

### 3. Replace `buildObjectifs()` in ObjectifsPage.jsx

```jsx
const goals = useQuery(api.goals.listByBranch, { branchId }) ?? []
// goals[n].pct, goals[n].currentAmount, goals[n].targetAmount are now server-computed
```

Remove the `buildObjectifs()` function and all hardcoded deadline/days arrays.

### 4. Wire "Nouvel objectif" button

Connect to the `create` mutation with a form that captures category, target amount, deadline, and the linked customer.

### 5. Update goal status automatically

Add a scheduled function (Convex cron) that runs daily and updates goal `status` based on progress vs. deadline:
- `pct >= 100` → `atteint`
- `daysLeft < 21 && pct < 80` → `enretard`
- otherwise → `encours`

## Acceptance Criteria

- [ ] Goals load from Convex and reflect real transaction totals.
- [ ] Progress percentages update in real time as new transactions are recorded.
- [ ] "Nouvel objectif" creates a record in the `savingsGoals` table.
- [ ] The Spotlight card correctly shows the goal closest to its target.
- [ ] Category distribution chart is computed from live data.
