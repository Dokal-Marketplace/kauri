---
title: "[Security] Hardcoded tenantId in authz.ts breaks multi-branch isolation"
labels: security, bug
priority: critical
---

## Description

The authorization client in `convex/authz.ts` is instantiated with a hardcoded `tenantId` at module load time:

```ts
// convex/authz.ts:72
export const authz = new Authz(components.authz, {
  permissions,
  roles,
  tenantId: "branch-ouaga-01",  // ← hardcoded
});
```

## Impact

This is a critical authorization bug. Every user — regardless of their actual branch — is evaluated against the Bobo-Dioulasso tenant:

- An agent in Banfora or Hounde inherits permissions scoped to a branch they don't belong to.
- Branch-level data isolation (the primary security boundary in `schema.ts`) is completely bypassed.
- Role checks (`authz.require(ctx, subject, "transactions:collect")`) grant or deny based on the wrong tenant context.

## Suggested Fix

Resolve `tenantId` dynamically per mutation from the authenticated user's `branchId`:

```ts
// Inside each mutation handler
const agent = await ctx.db
  .query("users")
  .withIndex("by_token", q => q.eq("tokenIdentifier", identity.subject))
  .unique();
if (!agent) throw new Error("Agent not found");

await authz.require(ctx, identity.subject, "transactions:collect", {
  tenantId: agent.branchId,
});
```

Review `@djpanda/convex-authz` docs for the correct API surface for dynamic tenant context.
