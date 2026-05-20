import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authz } from "./authz";

export const settleDailyCash = mutation({
  args: {
    agentId: v.id("users"),
    physicalAmount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const verifier = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!verifier) throw new Error("User not found");

    await authz.withTenant(verifier.branchId).require(ctx, identity.subject, "reconciliation:liquidate");

    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    const startOfDay = new Date(today + "T00:00:00Z").getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1; // = 23:59:59.999Z, couvre toute la journée

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_agent_date", (q) => q.eq("agentId", args.agentId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("timestamp"), startOfDay),
          q.lte(q.field("timestamp"), endOfDay)
        )
      )
      .collect();

    if (!transactions[0]) throw new Error("No transactions found for agent today");

    const systemExpected = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const variance = args.physicalAmount - systemExpected;
    const status = variance === 0 ? "settled" : "discrepancy";

    const reconciliationId = await ctx.db.insert("reconciliations", {
      agentId: args.agentId,
      branchId: transactions[0].branchId,
      verifiedBy: verifier._id,
      date: today,
      systemExpectedAmount: systemExpected,
      physicalCashReceived: args.physicalAmount,
      variance: variance,
      status: status,
      timestamp: Date.now(),
      notes: args.notes,
    });

    return { reconciliationId, variance };
  },
});
