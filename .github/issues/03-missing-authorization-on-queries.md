---
title: "[Security] listByAgent and listByBranch queries lack authorization scoping"
labels: security, bug
priority: critical
---

## Description

Both queries in `convex/transactions.ts` only verify that the caller is authenticated, but do not check whether the caller has the right to access the requested resource.

```ts
// convex/transactions.ts:81-88
export const listByAgent = query({
  args: { agentId: v.id("users") },
  handler: async (ctx, args) => {
    if (!(await ctx.auth.getUserIdentity())) throw new Error("Unauthenticated");
    // No check: is the caller allowed to view this agentId's transactions?
    return ctx.db.query("transactions")
      .withIndex("by_agent_date", q => q.eq("agentId", args.agentId))
      .collect();
  },
});
```

The same issue exists in `listByBranch` (line 92).

## Impact

Any authenticated user (including a `field_agent`) can query the full transaction history of any other agent or any branch simply by passing a different ID. This exposes sensitive financial data across the entire organization.

## Suggested Fix

Enforce that:
- A `field_agent` can only query their own `agentId`.
- A `supervisor` or `accountant` can query within their own `branchId`.

```ts
handler: async (ctx, args) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");

  const caller = await ctx.db
    .query("users")
    .withIndex("by_token", q => q.eq("tokenIdentifier", identity.subject))
    .unique();
  if (!caller) throw new Error("User not found");

  // Field agents may only view their own transactions
  if (caller._id !== args.agentId) {
    await authz.require(ctx, identity.subject, "transactions:audit");
  }
  // ... rest of query
},
```
