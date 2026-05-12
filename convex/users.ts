import { query } from "./_generated/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!user) return null;

    const branch = await ctx.db.get(user.branchId);
    const org = branch ? await ctx.db.get(branch.organizationId) : null;

    return {
      ...user,
      branch,
      organization: org,
      tenantId: user.branchId,
    };
  },
});
