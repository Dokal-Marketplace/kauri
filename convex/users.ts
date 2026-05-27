import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { authz } from './authz'

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!user) return null

    const branch = await ctx.db.get(user.branchId)
    const org = branch ? await ctx.db.get(branch.organizationId) : null

    return {
      ...user,
      branch,
      organization: org,
      tenantId: user.branchId,
    }
  },
})

export const onboard = mutation({
  args: {
    // Organisation
    orgName:       v.string(),
    country:       v.string(),
    currency:      v.string(),
    licenseNumber: v.string(),
    // Branch
    branchName:    v.string(),
    branchLocation:v.string(),
    branchCode:    v.string(),
    // User
    fullName:      v.string(),
    phoneNumber:   v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Non authentifié')

    // Prevent duplicate registration
    const existing = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (existing) throw new Error('Ce compte est déjà enregistré')

    const orgId = await ctx.db.insert('organizations', {
      name: args.orgName,
      country: args.country,
      currency: args.currency,
      licenseNumber: args.licenseNumber,
      status: 'active',
    })

    const branchId = await ctx.db.insert('branches', {
      organizationId: orgId,
      name: args.branchName,
      location: args.branchLocation,
      code: args.branchCode,
    })

    await ctx.db.insert('users', {
      fullName: args.fullName,
      email: identity.email ?? '',
      phoneNumber: args.phoneNumber,
      tokenIdentifier: identity.subject,
      branchId,
      status: 'active',
    })

    // Assign admin role so the org creator has full operational permissions
    await authz.withTenant(branchId).assignRole(ctx, identity.subject, 'admin')
  },
})
