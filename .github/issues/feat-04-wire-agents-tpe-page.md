---
title: "[Feature] Wire AgentsPage to real Convex user and device data"
labels: feature, convex, frontend
priority: high
---

## Description

`src/pages/AgentsPage.jsx` uses a hardcoded `AGENTS` array with embedded device telemetry. The Convex schema has both a `users` table and a `devices` table. Neither is queried from the frontend.

## Tasks

### 1. Add `convex/agents.ts` with user and device queries

```ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { authz } from './authz'

export const listByBranch = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    const users = await ctx.db
      .query('users')
      .withIndex('by_branch', q => q.eq('branchId', args.branchId))
      .collect()
    // Join each user with their assigned device
    return Promise.all(users.map(async u => {
      const device = await ctx.db
        .query('devices')
        .filter(q => q.eq(q.field('assignedTo'), u._id))
        .first()
      return { ...u, device }
    }))
  },
})

export const bindDevice = mutation({
  args: { userId: v.id('users'), serialNumber: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    await authz.require(ctx, identity.subject, 'devices:bind')
    const device = await ctx.db
      .query('devices')
      .withIndex('by_serial', q => q.eq('serialNumber', args.serialNumber))
      .unique()
    if (!device) throw new Error('Device not found')
    return ctx.db.patch(device._id, { assignedTo: args.userId })
  },
})
```

Note: `users` table in `schema.ts` is missing a `by_branch` index — add `.index("by_branch", ["branchId"])` to the `users` table definition.

### 2. Replace static AGENTS in AgentsPage.jsx

```jsx
const agents = useQuery(api.agents.listByBranch, { branchId }) ?? []
```

Map the Convex shape to the UI shape (the static array has `device.battery`, `device.signal`, etc. which are not yet in the schema — see task 3).

### 3. Extend `devices` table with telemetry fields

The current schema stores only `serialNumber`, `model`, `assignedTo`, `status`, `lastSync`. The UI needs `battery`, `signal`, `queuedTransactions`. Add these as optional fields:

```ts
// schema.ts — devices table
batteryPct:  v.optional(v.number()),
signalLevel: v.optional(v.number()),   // 0–5
queuedCount: v.optional(v.number()),
```

TPE firmware should push these values on each sync (out of scope for this issue — tracked separately in feat-07).

### 4. Wire "Forcer sync" button

Add a `requestSync` mutation that updates a `syncRequestedAt` timestamp on the device record, which the TPE firmware polls.

### 5. Wire "Nouvel agent" button

Add a `createUser` mutation gated behind `it_admin` or `supervisor` role and connect it to an agent creation form.

## Acceptance Criteria

- [ ] Agent list loads from Convex and shows real assigned devices.
- [ ] Device sync status reflects `lastSync` from the `devices` table.
- [ ] TPE bind action (`bindDevice`) is restricted to `it_admin` role.
- [ ] Branch and role filters work against live data.
- [ ] The permissions matrix card is read from role definitions (can remain static for now).
