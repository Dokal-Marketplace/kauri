# Contributing to Kauri

This guide is for human developers working on the codebase. It covers the day-to-day workflow,
project conventions, and the decisions behind the architecture.

---

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- A Convex account (free tier is fine for dev)
- A Clerk account (free tier is fine for dev)

---

## First-time setup

```bash
git clone <repo>
cd kauri
pnpm install

cp .env.example .env.local
# Fill in VITE_CONVEX_URL and VITE_CLERK_PUBLISHABLE_KEY
```

Open two terminals:

```bash
# Terminal 1 — backend
pnpm convex dev

# Terminal 2 — frontend
pnpm dev
```

The Convex CLI watches `convex/` and syncs schema/function changes live. You never need to
restart it for backend changes.

---

## Project overview

Kauri is a branch operations dashboard for microfinance cooperatives. A cooperative has one
**organization**, multiple **branches**, and agents who work at a branch. The system manages:

- **Clients** — savings accounts, KYC, balance history
- **Agents** — staff managing client relationships
- **Transactions** — deposits, withdrawals, contributions
- **Goals** — savings targets clients set (school fees, housing, pilgrimage, etc.)
- **Disbursements** — loan or benefit payouts to clients
- **Reconciliation** — agents reconcile their daily cash collection with the system

The UI is entirely in **French**. The currency is **FCFA (XOF)**.

---

## Tech stack

| Concern         | Tool           | Notes                                                         |
| --------------- | -------------- | ------------------------------------------------------------- |
| UI framework    | React 19       | No class components except the top-level `ErrorBoundary`      |
| Build           | Vite 6         | Fast HMR, ESM output                                          |
| Routing         | React Router 7 | All pages lazy-loaded                                         |
| Backend         | Convex         | Serverless DB + realtime queries + scheduled jobs             |
| Auth            | Clerk          | JWT, SSO-ready. Convex validates Clerk tokens server-side     |
| Notifications   | Novu           | In-app notification bell                                      |
| Styling         | Plain CSS      | One global file — `src/styles.css`. No Tailwind, no CSS-in-JS |
| Package manager | pnpm           | Do not use npm or yarn — the lockfile is pnpm-only            |

---

## Repository layout

```
src/
  App.jsx           Route definitions. Every page is lazy-loaded here.
  main.jsx          Providers (Clerk, Convex, Router, Tenant).
  components.jsx    Shared component library. Add reusable UI here first.
  icons.jsx         All SVG icons, exported as <I.Name />.
  styles.css        Global styles and CSS design tokens.

  pages/            One file per route. Keep pages focused — extract
                    sub-components to components/ when they grow.

  components/       Feature components and modals that are too large for
                    components.jsx but used across multiple pages.
    providers/      React context providers.

  hooks/            Custom hooks. Currently:
                      useCurrentUser   — Clerk + Convex user identity
                      useCurrentBranch — branch scope for the logged-in user

  utils/            Pure functions with no React dependency.

convex/             Backend. All Convex functions are TypeScript.
  schema.ts         Table definitions. The single source of truth for data shapes.
  authz.ts          Row-level access control. Call these guards in every function.
  *.ts              One file per domain (customers, transactions, agents, etc.)
  _generated/       Never edit. Regenerated automatically by `convex dev`.
```

---

## Development workflow

### Branching

```
main        production-ready, protected
develop     integration branch — open PRs against this
feat/*      new features
fix/*       bug fixes
chore/*     maintenance, deps, config
```

### Commit messages

Commits are linted with commitlint. The format is:

```
<type>(<optional scope>): <description>

feat: add agent search filter
fix(reconciliation): correct variance calculation on same-day reversal
chore: bump convex to 1.38
refactor(clients): extract ClientDrawer to its own file
```

Valid types: `feat` `fix` `refactor` `chore` `docs` `style` `test` `build` `ci` `perf` `revert`

A pre-commit hook runs ESLint + Prettier on staged files automatically. If it blocks your
commit, read the error — it will tell you exactly what to fix.

### Daily commands

```bash
pnpm dev            # Start dev server
pnpm lint           # Check for lint errors
pnpm lint:fix       # Auto-fix lint errors
pnpm format         # Format everything with Prettier
pnpm build          # Production build
```

---

## Backend — Convex

### How Convex works

Convex is not a traditional REST API. Functions are TypeScript files in `convex/` that run
server-side. The frontend calls them via React hooks:

```js
// Read (reactive — updates automatically when data changes)
const clients = useQuery(api.customers.listByBranch, { branchId })

// Write
const createClient = useMutation(api.customers.createProspect)
await createClient({ fullName, phoneNumber, idNumber })
```

Changes to `convex/` are live-synced when `pnpm convex dev` is running. You do not need to
restart anything.

### Schema changes

Edit `convex/schema.ts`. The Convex CLI picks up the change and migrates automatically in dev.
In production, Convex handles schema evolution safely — adding optional fields is always safe,
removing or renaming requires a migration strategy.

**Always add an index for every field you filter or sort by.** Unindexed queries will be
rejected in production.

```ts
// schema.ts
customers: defineTable({
  branchId: v.id('branches'),
  fullName: v.string(),
  // ...
})
  .index('by_branch', ['branchId'])
  .index('by_phone', ['phoneNumber'])
```

### Authorization

Every Convex function that reads or writes protected data must call a guard from `authz.ts`:

```ts
export const listByBranch = query({
  args: { branchId: v.id('branches') },
  handler: async (ctx, args) => {
    await requireBranchAccess(ctx, args.branchId) // ← always first
    return ctx.db
      .query('customers')
      .withIndex('by_branch', (q) => q.eq('branchId', args.branchId))
      .collect()
  },
})
```

Do not skip the guard. The multi-tenant isolation of the entire product depends on it.

---

## Frontend patterns

### Conditional queries

Never call a query unconditionally when the args might not be ready yet. Use `'skip'`:

```js
// Good — waits until auth is loaded and branchId is known
const data = useQuery(api.foo.list, isLoaded && branchId ? { branchId } : 'skip')

// Bad — fires before auth resolves, may query with null args
const data = useQuery(api.foo.list, { branchId })
```

### Loading and empty states

Every data-fetching page needs three states:

```jsx
// 1. Auth/data still loading
if (!isLoaded || data === undefined) return <SkeletonTablePage />

// 2. Loaded but empty
if (data.length === 0)
  return (
    <EmptyState
      illustration={<YourIllustration />}
      title="Aucun élément"
      sub="Le tableau s'affichera dès le premier enregistrement."
    />
  )

// 3. Normal render
return <div>...</div>
```

Skeleton components are in `src/components/Skeleton.jsx`.
Illustrations are in `src/components/Illustrations.jsx` — add new ones there.

### Components defined outside render

Never define a component inside another component's function body. React will re-create it
on every render, which breaks state, focus, and performance:

```jsx
// Bad — SortHead is re-created on every render of ParentPage
export default function ParentPage() {
  const SortHead = ({ col, children }) => <th>...</th> // ← never do this
}

// Good — SortHead is stable across renders
function SortHead({ col, sortBy, sortDir, onToggle, children }) {
  return <th onClick={() => onToggle(col)}>...</th>
}

export default function ParentPage() {
  // SortHead is used here, not defined here
}
```

### Number formatting

Always use `fmt()` from `components.jsx` for amounts. It formats to French locale with correct
spacing: `fmt(15000)` → `"15 000"`.

Never use `.toFixed()` or `.toLocaleString()` directly in JSX.

---

## Styling

All CSS lives in `src/styles.css`. It uses CSS custom properties (design tokens) for colors,
spacing, and typography.

Key tokens:

```css
--brand          Primary brand color
--pos            Positive / success (green)
--neg            Negative / error (red)
--warn           Warning (amber)
--surface        Card/panel background
--border         Default border
--ink            Primary text
--ink-2          Secondary text
--ink-3          Tertiary / muted text
```

Add new styles at the bottom of `styles.css`. Do not create separate CSS files per component.
Reuse existing utility classes (`.btn`, `.card`, `.tag`, `.filter-group`, etc.) before adding
new ones.

---

## Adding a new feature

Checklist:

- [ ] Schema change in `convex/schema.ts` (if new data)
- [ ] Convex functions in the relevant domain file (with authz guards and indexes)
- [ ] Page or component in `src/`
- [ ] Route in `App.jsx` (if new page)
- [ ] Nav entry in `components.jsx` → `NAV_ITEMS` (if it should appear in the sidebar)
- [ ] Loading skeleton while data is fetching
- [ ] Empty state when there is no data
- [ ] All user-facing strings in French

---

## Domain documentation

- [Reconciliation workflow](reconciliation.md) — how agents close out their daily cash collection
