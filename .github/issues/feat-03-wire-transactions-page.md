---
title: "[Feature] Wire TransactionsPage to real Convex queries and mutations"
labels: feature, convex, frontend
priority: high
---

## Description

`src/pages/TransactionsPage.jsx` uses a hardcoded `TX_FULL` array defined at the top of the file. The Convex backend already has `collectCash` and `reverseTransaction` mutations in `convex/transactions.ts`, plus `listByBranch` and `listByAgent` queries — but nothing is connected to the UI.

## Tasks

### 1. Replace TX_FULL with a live Convex query

```jsx
// TransactionsPage.jsx
import { useQuery, useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'

export default function TransactionsPage() {
  const branchId = useCurrentBranch()
  const txList = useQuery(api.transactions.listByBranch, { branchId }) ?? []
  // replace TX_FULL with txList everywhere
}
```

Note: the Convex `transactions` table uses `timestamp: number` and `status: "completed" | "reversed"` — the UI uses `"validée" | "en attente" | "annulée"`. Add a mapping layer or align the schema values.

### 2. Wire the "Valider" button in TxDrawer

Transactions with `status === "en attente"` show a Valider button. Add a `validateTransaction` mutation or map pending → completed via a status update.

### 3. Wire the "Annuler" button in TxDrawer to `reverseTransaction`

```jsx
// TxDrawer footer
const reverse = useMutation(api.transactions.reverseTransaction)

<button onClick={() => reverse({ transactionId: tx._id, reason: "Annulation via dashboard" })}>
  Annuler
</button>
```

Display the reversal reason input before confirming.

### 4. Wire "Exporter CSV" button

Implement a client-side CSV export from the filtered `txList` array using the browser `Blob` API. No backend change needed.

### 5. Add a `listByBranch` date-range filter

Extend the existing query to accept optional `from` and `to` timestamps so the period segmenter (24h / 7j / 30j / Tout) actually filters data server-side:

```ts
export const listByBranch = query({
  args: {
    branchId: v.id('branches'),
    from: v.optional(v.number()),
    to:   v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // ...
    let q = ctx.db.query('transactions').withIndex('by_branch', ...)
    if (args.from) q = q.filter(r => r.gte(r.field('timestamp'), args.from!))
    if (args.to)   q = q.filter(r => r.lte(r.field('timestamp'), args.to!))
    return q.order('desc').collect()
  },
})
```

## Acceptance Criteria

- [ ] Transaction list loads from Convex and reflects real-time inserts.
- [ ] Period segmenter (24h / 7j / 30j) correctly filters results.
- [ ] Reversal confirmation calls `reverseTransaction`; the row updates to "Annulée" without refresh.
- [ ] Reversal is blocked by the backend if the day is already reconciled (existing check in `reverseTransaction`).
- [ ] CSV export downloads correctly for the current filtered view.
