---
title: "[Security] Silent null supervisor leaves audit trail gap in reverseTransaction"
labels: security, bug
priority: high
---

## Description

In `convex/transactions.ts`, the `reverseTransaction` mutation looks up the supervisor but uses optional chaining when writing the audit field:

```ts
// convex/transactions.ts:54-76
const supervisor = await ctx.db
  .query("users")
  .withIndex("by_token", q => q.eq("tokenIdentifier", identity.subject))
  .unique();

// supervisor is never null-checked before here:
return await ctx.db.patch(args.transactionId, {
  status: "reversed",
  reversalReason: args.reason,
  reversedBy: supervisor?._id,  // ← silently omitted if supervisor is null
});
```

## Impact

If an authenticated user passes the permission check (`authz.require`) but has no matching record in the `users` table, the reversal completes successfully with `reversedBy: undefined`. This means a transaction can be voided with no recorded actor — an irreversible audit trail hole in a regulated financial system.

Compare with `approveDisbursement` in `convex/disbursements.ts:20`, which correctly throws when the user is not found.

## Suggested Fix

Apply the same guard used in `approveDisbursement`:

```ts
const supervisor = await ctx.db
  .query("users")
  .withIndex("by_token", q => q.eq("tokenIdentifier", identity.subject))
  .unique();
if (!supervisor) throw new Error("User not found");

return await ctx.db.patch(args.transactionId, {
  status: "reversed",
  reversalReason: args.reason,
  reversedBy: supervisor._id,  // no optional chaining needed
});
```
