---
title: "[Feature] Add useCurrentUser hook to expose authenticated user context across the app"
labels: feature, convex, frontend
priority: high
---

## Description

Every Convex-wired page (feat-02 through feat-09) needs to know the current user's `branchId`, `_id`, and `role` to pass as query arguments and gate UI elements. This context must be derived from the authenticated session once and shared — not re-fetched in each component.

## Tasks

### 1. Add `convex/users.ts` — a `me` query

```ts
import { query } from './_generated/server'

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    return ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.subject))
      .unique()
  },
})
```

### 2. Create `src/hooks/useCurrentUser.js`

```js
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function useCurrentUser() {
  return useQuery(api.users.me)
}
```

### 3. Create `src/hooks/useCurrentBranch.js`

```js
import { useCurrentUser } from './useCurrentUser'

export function useCurrentBranch() {
  const user = useCurrentUser()
  return user?.branchId ?? null
}
```

### 4. Add a UserContext provider (optional but recommended for perf)

Wrap the app in a context so `useCurrentUser` doesn't result in multiple Convex subscriptions:

```jsx
// src/context/UserContext.jsx
const UserContext = createContext(null)

export function UserProvider({ children }) {
  const user = useQuery(api.users.me)
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export const useUser = () => useContext(UserContext)
```

### 5. Use in App.jsx to conditionally render role-gated nav items

```jsx
const user = useCurrentUser()
const isAdmin = user?.role === 'it_admin' || user?.role === 'supervisor'

// Hide "Admin" sidebar group for field_agents
```

Note: `users` table currently has no `role` field — add `role: v.string()` to the schema, or derive it from the `authz` system.

## Acceptance Criteria

- [ ] `useCurrentUser()` returns the full user record for the logged-in identity.
- [ ] Returns `null` while loading (not `undefined`) so pages can show a skeleton.
- [ ] `useCurrentBranch()` returns the user's `branchId`, used as the argument to all branch-scoped queries.
- [ ] Only one Convex subscription is created for `me`, regardless of how many components call the hook.
