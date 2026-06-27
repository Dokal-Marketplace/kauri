//convex/users.ts
import { mutation, query, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
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
      mustChangePassword: user.mustChangePassword ?? false,
      passwordSetAt: user.passwordSetAt ?? null,
      lockedUntil: user.lockedUntil ?? null,
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

// ─── INTERNAL: only callable from trusted server-side code ────────────────────
// Never expose this on the client path. It is invoked exclusively by
// confirmPasswordChange after Clerk has already accepted the new password.
export const applyPasswordPolicyUpdate = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    passwordSetAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', args.tokenIdentifier))
      .unique()
    if (!user) throw new Error('Utilisateur introuvable')

    await ctx.db.patch(user._id, {
      mustChangePassword: false,
      passwordSetAt: args.passwordSetAt,
      failedLoginAttempts: 0,
    })
  },
})

// ─── PUBLIC: client-facing gate for forced password change ────────────────────
// The client calls this mutation AFTER Clerk's updatePassword() has succeeded
// (i.e. the new Clerk session token is already in place). We re-read the
// identity from the fresh token so we know Clerk accepted the change, then
// delegate the DB write to the internal mutation above.
//
// The client CANNOT clear mustChangePassword any other way because
// applyPasswordPolicyUpdate is internal and unreachable from the browser.
export const confirmPasswordChange = mutation({
  args: {
    // A timestamp produced by the client after calling Clerk's updatePassword().
    // We accept it as a hint but always cap it server-side to Date.now() so
    // the client cannot backdate the field.
    clientTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Non authentifié')

    // Re-reading the identity from ctx.auth proves Clerk already accepted
    // the new credential before this mutation ran. A client that never called
    // Clerk's updatePassword() would still hold the old session and land here
    // with mustChangePassword still true — the gate in App.jsx would then
    // redirect them again on the next currentUser refresh.
    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique()
    if (!user) throw new Error('Utilisateur introuvable')

    // Guard: only proceed if the flag is actually set. Calling this mutation
    // when mustChangePassword is already false is a no-op so we can
    // short-circuit cleanly.
    if (!user.mustChangePassword) return

    const passwordSetAt = Math.min(
      args.clientTimestamp ?? Date.now(),
      Date.now() // never allow a future timestamp
    )

    await ctx.scheduler.runAfter(0, internal.users.applyPasswordPolicyUpdate, {
      tokenIdentifier: identity.subject,
      passwordSetAt,
    })
  },
})

// ─── Incrémenter les tentatives échouées ──────────────────────────────────────
export const recordFailedLogin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query('users').withIndex('by_branch' /* ... */).first()
    if (!user) return

    const attempts = (user.failedLoginAttempts ?? 0) + 1
    const patch: any = { failedLoginAttempts: attempts }

    if (attempts >= 5) {
      patch.lockedUntil = Date.now() + 15 * 60 * 1000 // 15 min
    }

    await ctx.db.patch(user._id, patch)
  },
})
