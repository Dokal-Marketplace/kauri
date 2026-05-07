---
title: "[Feature] Bootstrap: wire ConvexProvider and authentication into the app"
labels: feature, convex, auth
priority: critical
---

## Description

The Convex backend is fully defined (`schema.ts`, `authz.ts`, mutations, queries) but the React app has no `ConvexProvider` and no auth provider. No mutation or query can run until this is in place — it is the prerequisite for every other Convex integration issue.

Currently `src/main.jsx` renders a bare React tree:

```jsx
// src/main.jsx — no Convex, no auth
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

## Tasks

### 1. Install dependencies
```bash
pnpm add @clerk/clerk-react  # or @auth0/auth0-react depending on provider choice
# convex is already in package.json
```

### 2. Add ConvexProvider + ClerkProvider to main.jsx

```jsx
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>
)
```

### 3. Add required environment variables to `.env`
```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 4. Add a login gate in App.jsx

```jsx
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'

export default function App() {
  return (
    <>
      <SignedIn>
        {/* existing app layout */}
      </SignedIn>
      <SignedOut>
        <SignInButton />
      </SignedOut>
    </>
  )
}
```

## Acceptance Criteria

- [ ] App renders without errors when `VITE_CONVEX_URL` is set.
- [ ] Unauthenticated users see a login screen.
- [ ] `ctx.auth.getUserIdentity()` returns a valid identity in Convex mutations.
- [ ] `convex dev` and `vite dev` can run simultaneously.
