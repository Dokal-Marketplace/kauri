---
title: "[Feature] Wire ClientsPage to real Convex customer data"
labels: feature, convex, frontend
priority: high
---

## Description

`src/pages/ClientsPage.jsx` currently imports all data from the static `src/data.jsx` mock:

```jsx
import { CLIENTS, CLIENT_KPIS, CLIENT_TX } from '../data'
```

The `customers` table is defined in `schema.ts` and seeded with real data via `convex/seed.ts`, but no queries exist to read it and no mutations are wired to the UI actions.

## Tasks

### 1. Add Convex queries in `convex/customers.ts` (new file)

```ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { authz } from './authz'

export const listByBranch = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    return ctx.db
      .query('customers')
      .withIndex('by_status', q => q.eq('status', 'verified'))
      .filter(q => q.eq(q.field('branchId'), args.branchId))
      .collect()
  },
})

export const createProspect = mutation({
  args: {
    fullName: v.string(),
    phoneNumber: v.string(),
    idNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    await authz.require(ctx, identity.subject, 'customers:create_prospect')
    const agent = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!agent) throw new Error('Agent not found')
    return ctx.db.insert('customers', {
      ...args,
      branchId: agent.branchId,
      onboardedBy: agent._id,
      status: 'prospect',
    })
  },
})
```

### 2. Replace static import in ClientsPage.jsx

```jsx
import { useQuery, useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useCurrentBranch } from '../hooks/useCurrentBranch' // see feat-01

export default function ClientsPage() {
  const branchId = useCurrentBranch()
  const clients = useQuery(api.customers.listByBranch, { branchId }) ?? []
  const createProspect = useMutation(api.customers.createProspect)
  // ...
}
```

### 3. Wire "Nouveau client" button to `createProspect` mutation

The button in the page header currently does nothing. Connect it to a modal/form that calls `createProspect`.

### 4. Wire client transaction history in ClientDrawer

Add a `listByCustomer` query in `convex/transactions.ts` and replace the `CLIENT_TX` static fallback in `ClientDrawer`.

## Acceptance Criteria

- [ ] Client list loads from Convex and updates in real-time when new customers are created.
- [ ] "Nouveau client" modal calls `createProspect` and the new record appears without page refresh.
- [ ] ClientDrawer shows real transaction history for the selected customer.
- [ ] Search and filter still work against live data.
- [ ] Unauthenticated users cannot access the query (Convex throws, UI shows error state).
