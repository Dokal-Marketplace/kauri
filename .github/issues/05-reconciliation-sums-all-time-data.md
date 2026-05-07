---
title: "[Bug] settleDailyCash sums all-time transactions instead of today's"
labels: bug
priority: high
---

## Description

The `settleDailyCash` mutation in `convex/reconciliation.ts` fetches all `completed` transactions for an agent with no date filter:

```ts
// convex/reconciliation.ts:21-24
const transactions = await ctx.db
  .query("transactions")
  .withIndex("by_agent_date", q => q.eq("agentId", args.agentId))
  .filter(q => q.eq(q.field("status"), "completed"))
  .collect();
// Note in code: "In production, you'd use a more robust time-range check"
```

The comment acknowledges this is incomplete, but the code is being used as-is.

## Impact

`systemExpectedAmount` is computed as the cumulative lifetime total for the agent, not the daily total. Every reconciliation will produce a large incorrect variance, making the `discrepancy` / `settled` status meaningless. Agents cannot be correctly reconciled.

## Suggested Fix

Filter transactions to the current date by comparing `timestamp` against the start-of-day epoch:

```ts
const today = new Date().toISOString().split("T")[0]; // "2026-05-07"
const startOfDay = new Date(today + "T00:00:00Z").getTime();
const endOfDay   = new Date(today + "T23:59:59Z").getTime();

const transactions = await ctx.db
  .query("transactions")
  .withIndex("by_agent_date", q => q.eq("agentId", args.agentId))
  .filter(q =>
    q.and(
      q.eq(q.field("status"), "completed"),
      q.gte(q.field("timestamp"), startOfDay),
      q.lte(q.field("timestamp"), endOfDay)
    )
  )
  .collect();
```
