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

    const roles = await authz.withTenant(user.branchId).getUserRoles(ctx, identity.subject)
    const role = roles[0]?.role ?? null

    // Attach the device assigned to this user (if any)
    const device = await ctx.db
      .query('devices')
      .withIndex('by_assigned_to', (q) => q.eq('assignedTo', user._id))
      .first()

    return {
      ...user,
      branch,
      organization: org,
      tenantId: user.branchId,
      role,
      device: device ?? null,
    }
  },
})

export const onboard = mutation({
  args: {
    // Organisation
    orgName: v.string(),
    country: v.string(),
    currency: v.string(),
    licenseNumber: v.string(),
    // Branch
    branchName: v.string(),
    branchLocation: v.string(),
    branchCode: v.string(),
    // User
    fullName: v.string(),
    phoneNumber: v.string(),
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
      email: (identity.email ?? '').toLowerCase(),
      phoneNumber: args.phoneNumber,
      tokenIdentifier: identity.subject,
      branchId,
      status: 'active',
    })

    // Assign admin role so the org creator has full operational permissions
    await authz.withTenant(branchId).assignRole(ctx, identity.subject, 'admin')
  },
})

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Called after every agent Password sign-in.
// For returning agents (already linked): no-ops immediately.
// For first-time agents: verifies the single-use invite token (by SHA-256 hash),
// swaps the placeholder tokenIdentifier, transfers the role, and burns the token.
export const linkAgentAccount = mutation({
  args: { inviteToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Non authentifié')

    // Already linked — returning agent, nothing to do
    const already = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (already) return already._id

    // First-time activation requires the raw invite token from the invite URL
    if (!args.inviteToken) {
      throw new Error('Jeton d\'invitation requis pour la première connexion')
    }

    const hash = await sha256Hex(args.inviteToken)

    const invitedUser = await ctx.db
      .query('users')
      .withIndex('by_invite_token_hash', (q) => q.eq('inviteTokenHash', hash))
      .unique()

    if (!invitedUser || !invitedUser.tokenIdentifier.startsWith('invited|')) {
      throw new Error('Jeton d\'invitation invalide ou déjà utilisé')
    }

    // Link account: swap placeholder for real convex-auth subject, burn the token
    await ctx.db.patch(invitedUser._id, {
      tokenIdentifier: identity.subject,
      inviteTokenHash: undefined,
    })

    // Transfer role from placeholder to real subject
    const branchAuthz = authz.withTenant(invitedUser.branchId)
    const roles = await branchAuthz.getUserRoles(ctx, invitedUser.tokenIdentifier)
    if (roles.length > 0) {
      await branchAuthz.removeRole(ctx, invitedUser.tokenIdentifier, roles[0].role)
      await branchAuthz.assignRole(ctx, identity.subject, roles[0].role)
    }

    return invitedUser._id
  },
})
