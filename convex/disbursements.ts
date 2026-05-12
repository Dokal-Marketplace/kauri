// convex/disbursements.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { authz } from "./authz";

export const approveDisbursement = mutation({
  args: { disbursementId: v.id("disbursements") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const supervisor = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!supervisor) throw new Error("User not found");

    await authz.withTenant(supervisor.branchId).require(ctx, identity.subject, "disbursements:approve");

    const record = await ctx.db.get(args.disbursementId);
    if (!record) throw new Error("Disbursement not found");

    if (record.initiatedBy === supervisor._id) {
      throw new Error("Fraud Prevention: You cannot approve your own request.");
    }

    await ctx.db.patch(args.disbursementId, {
      status: "approved",
      approvedBy: supervisor._id,
    });
  },
});