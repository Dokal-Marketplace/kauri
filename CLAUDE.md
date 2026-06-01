# Kauri — Developer Guide

Kauri is a microfinance branch management dashboard. It handles agents, clients, savings goals,
transactions, disbursements, and daily cash reconciliation for savings cooperatives.

---

## Stack

| Layer           | Technology                                              |
| --------------- | ------------------------------------------------------- |
| Frontend        | React 19, Vite 6, React Router 7                        |
| Backend         | Convex (serverless DB + functions, TypeScript)          |
| Auth            | Clerk (JWT) wired into Convex via `auth.config.ts`      |
| Notifications   | Novu (`@novu/react`)                                    |
| Styling         | Plain CSS (`src/styles.css`) — no Tailwind or CSS-in-JS |
| Package manager | **pnpm** — always use `pnpm`, never `npm` or `yarn`     |

---

## Local setup

```bash
pnpm install

# Copy env template and fill in values
cp .env.example .env.local

# Start Convex dev server (separate terminal)
pnpm convex dev

# Start Vite dev server
pnpm dev
```

### Required env vars

```
VITE_CONVEX_URL=          # Convex deployment URL
VITE_CLERK_PUBLISHABLE_KEY=  # Clerk publishable key
```

---

## Codebase layout

```
src/
  App.jsx               # Root router — lazy-loads all pages
  main.jsx              # React entry point (Clerk + Convex providers)
  components.jsx        # Shared UI component library (fmt, KPI, PageHeader, etc.)
  icons.jsx             # Icon registry (used via <I.IconName />)
  styles.css            # Global CSS — all design tokens and utility classes live here

  pages/                # One file per route, lazy-loaded
  components/           # Feature-specific components and modal sub-components
  hooks/                # Custom React hooks
  utils/                # Pure utilities

convex/                 # Backend — Convex functions (TypeScript)
  schema.ts             # Single source of truth for all table shapes
  *.ts                  # One file per domain (customers, transactions, etc.)
  authz.ts              # Row-level authorization rules
  _generated/           # Auto-generated — never edit by hand
```

---

## Data model

The app is multi-tenant. Every record flows through this hierarchy:

```
Organization  →  Branch  →  User / Agent
                         →  Customer
                         →  Transaction
                         →  Disbursement
                         →  Reconciliation
```

**Isolation rule:** queries filter by `branchId` (not `organizationId`) in most cases.
Branch admins see only their branch. Organization admins see all branches.

The `convex/authz.ts` file enforces this at the function level — read it before writing new
Convex queries that touch sensitive tables.

---

## Auth flow

Clerk handles login. Convex validates the Clerk JWT. The frontend bridges both via two hooks:

```js
// Who is the logged-in user?
const { isLoaded, convexUser, tenantId } = useCurrentUser()

// What branch are they scoped to?
const branchId = useCurrentBranch()
```

Always gate data fetches on `isLoaded`:

```jsx
const data = useQuery(api.customers.listByBranch, isLoaded && branchId ? { branchId } : 'skip')
```

The `'skip'` string tells Convex not to run the query yet. This prevents unauthorized queries
during the auth-loading window.

---

## Adding a new page

1. Create `src/pages/FooPage.jsx`
2. Lazy-load it in `src/App.jsx`:
   ```js
   const FooPage = lazyWithReload(() => import('./pages/FooPage'))
   ```
3. Add a `<Route>` in the router
4. Add a nav entry in `components.jsx` → `NAV_ITEMS`

**Page structure template:**

```jsx
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { PageHeader, KPI } from '../components'
import { SkeletonTablePage } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import { YourIllustration } from '../components/Illustrations'

export default function FooPage() {
  const { isLoaded, convexUser } = useCurrentUser()
  const branchId = convexUser?.branchId ?? null

  const data = useQuery(api.foo.listByBranch, isLoaded && branchId ? { branchId } : 'skip')

  if (!isLoaded) return <SkeletonTablePage />
  if (!data?.length) return <EmptyState illustration={<YourIllustration />} title="No items" />

  return (
    <>
      <PageHeader crumbs={['Foo']} title="Foo" />
      {/* page content */}
    </>
  )
}
```

---

## Adding a Convex function

Backend functions live in `convex/`. Use the domain file that matches (e.g. new customer query
goes in `convex/customers.ts`).

```ts
// convex/foo.ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireBranchAccess } from './authz'

export const listByBranch = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    await requireBranchAccess(ctx, args.branchId)
    return ctx.db
      .query('foo')
      .withIndex('by_branch', (q) => q.eq('branchId', args.branchId))
      .collect()
  },
})
```

Rules:

- Always call an `authz` guard before reading/writing data
- Add an index in `schema.ts` for every filter you use — never do full-table scans
- Mutations that touch balances or financial records must be idempotent where possible

---

## Shared components

### `components.jsx` — the UI library

| Export        | Purpose                                        |
| ------------- | ---------------------------------------------- |
| `fmt(n)`      | French-locale number formatter (`15 000`)      |
| `PageHeader`  | Top bar with breadcrumbs and optional search   |
| `KPI`         | Stat card with value, label, delta             |
| `Sparkline`   | Mini SVG line chart for KPI cards              |
| `SearchInput` | Debounced search field                         |
| `Topbar`      | App-level nav bar with online toggle and inbox |
| `Sidebar`     | Left nav with `NAV_ITEMS` groups               |

### Icons — `<I.Name />`

All icons live in `src/icons.jsx` and are consumed via the `I` namespace:

```jsx
import { I } from '../icons'
<I.Plus size={14} />
<I.ArrowUp size={14} stroke="white" />
```

### Empty states

Use `EmptyState` (full page) or `EmptyInline` (inside a card). Always pair with an
illustration from `components/Illustrations.jsx`.

### Skeletons

Use `SkeletonTablePage` for full-page loading and `SkeletonTableRows` for table bodies.
Show skeletons while `isLoaded === false` or while a Convex query returns `undefined`.

---

## Sortable tables

`SortHead` is a reusable sortable column header. Define it **outside** the page component
and pass state as props — defining it inside causes React to re-create it on every render:

```jsx
function SortHead({ col, sortBy, sortDir, onToggle, children, align }) {
  return (
    <th onClick={() => onToggle(col)} style={{ cursor: 'pointer', textAlign: align || 'left' }}>
      {children}
      <span>{sortBy === col ? (sortDir === 'asc' ? '▲' : '▼') : '▾'}</span>
    </th>
  )
}
```

---

## Code quality

```bash
pnpm lint          # ESLint check
pnpm lint:fix      # ESLint auto-fix
pnpm format        # Prettier format
pnpm format:check  # Prettier check (CI)
```

Husky runs lint-staged on every commit (ESLint + Prettier on staged files) and commitlint
on the commit message.

### Commit format (enforced)

```
type(scope): description

feat: add client search filter
fix: correct disbursement balance calculation
chore: update convex schema index
refactor: extract SortHead to module scope
```

Valid types: `feat fix chore docs style refactor test build ci perf revert`

### ESLint rules that matter

| Rule                            | Why                                                                         |
| ------------------------------- | --------------------------------------------------------------------------- |
| `react-hooks/rules-of-hooks`    | Hooks can't be called conditionally                                         |
| `react-hooks/exhaustive-deps`   | Missing deps cause stale-closure bugs                                       |
| `react-hooks/static-components` | Components defined inside render are re-created each render                 |
| `react-hooks/purity`            | No `Math.random()` / `Date.now()` in render — use `useMemo` or move outside |
| `prefer-const`                  | Use `const` unless the binding is reassigned                                |
| `eqeqeq`                        | Always use `===`; `==` is only allowed for `null` checks                    |
| `no-console`                    | Use `console.warn` / `console.error` only                                   |

---

## Localization

The UI is in **French**. All user-facing strings, labels, and error messages must be in French.
Numbers use the `fmt()` helper which formats to French locale (`15 000`, not `15,000`).
Currency is `FCFA` (XOF).

---

## Docs

Additional domain documentation lives in `docs/`:

- `docs/reconciliation.md` — daily cash reconciliation process
