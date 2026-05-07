---
title: "[Feature] Add products table to Convex schema and wire ProductsPage"
labels: feature, convex, frontend
priority: medium
---

## Description

`src/pages/ProductsPage.jsx` has a fully functional UI (CRUD editor, card/table views, duplication) but all state is local React state using a hardcoded `PRODUCTS_SEED` array. There is no `products` table in `convex/schema.ts` and no backend persistence. Creating or editing a product is lost on page refresh.

## Tasks

### 1. Add `products` table to `convex/schema.ts`

```ts
products: defineTable({
  organizationId: v.id('organizations'),
  code:           v.string(),
  name:           v.string(),
  family:         v.union(
    v.literal('epargne'),
    v.literal('credit'),
    v.literal('tontine'),
    v.literal('assurance')
  ),
  summary:        v.string(),
  status:         v.union(v.literal('actif'), v.literal('brouillon'), v.literal('archive')),
  rate:           v.number(),
  durationMin:    v.number(),
  durationMax:    v.number(),
  minDeposit:     v.number(),
  maxBalance:     v.number(),
  fees:           v.number(),
  feesUnit:       v.union(v.literal('FCFA'), v.literal('%')),
  graceDays:      v.number(),
  kycLevel:       v.union(v.literal('Allégée'), v.literal('Standard'), v.literal('Renforcée')),
  targetSegments: v.array(v.string()),
  branchCodes:    v.array(v.string()),
})
  .index('by_org',    ['organizationId'])
  .index('by_status', ['organizationId', 'status']),
```

### 2. Create `convex/products.ts`

```ts
export const list = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    return ctx.db
      .query('products')
      .withIndex('by_org', q => q.eq('organizationId', args.organizationId))
      .collect()
  },
})

export const upsert = mutation({
  args: { /* all product fields */ productId: v.optional(v.id('products')), ... },
  handler: async (ctx, args) => {
    // Supervisor or admin only
    await authz.require(ctx, identity.subject, 'products:manage') // new permission
    if (args.productId) return ctx.db.patch(args.productId, { ...fields })
    return ctx.db.insert('products', { ...fields })
  },
})
```

Note: add `products: { manage: true }` to `convex/authz.ts` permissions, and assign it to `supervisor` and `it_admin` roles.

### 3. Replace local state in ProductsPage.jsx

```jsx
const products = useQuery(api.products.list, { organizationId }) ?? []
const upsert   = useMutation(api.products.upsert)

// Replace onSave to call the mutation:
const onSave = async (p) => {
  await upsert({ productId: p._id ?? undefined, ...p })
  setEditor(null)
}
```

### 4. Add products to seed.ts

Seed the `PRODUCTS_SEED` data into the `products` table so development starts with a populated catalogue.

## Acceptance Criteria

- [ ] Product catalogue persists across page refreshes.
- [ ] Creating a product calls `upsert` and appears in the list in real time.
- [ ] Editing a product updates the record in Convex.
- [ ] Archiving a product sets `status: "archive"` — it remains in the DB.
- [ ] A `field_agent` cannot create or edit products (permission denied in UI and backend).
