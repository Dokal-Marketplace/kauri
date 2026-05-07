---
title: "[UX] Pagination controls in ClientsPage and TransactionsPage are non-functional"
labels: bug, ux
priority: low
---

## Description

Both `ClientsPage` and `TransactionsPage` render pagination UI — page number buttons and Suivant/Précédent controls — but none of them are connected to any state or logic.

```jsx
// src/pages/ClientsPage.jsx:268-276
<div className="pager">
  <button className="btn ghost sm" disabled>‹ Précédent</button>
  <span className="page-num on">1</span>
  <span className="page-num">2</span>
  <span className="page-num">3</span>
  <button className="btn ghost sm">Suivant ›</button>  {/* does nothing */}
</div>
```

Page 2, Page 3, and "Suivant" have no `onClick` handlers and no backing page state.

## Impact

- Users clicking "Suivant" or page numbers get no feedback and no navigation.
- The footer says "Affichage de X sur Y clients" suggesting more data exists, but it's always the full list on one page.
- Decorative pagination erodes trust in the UI.

## Suggested Fix

Either implement pagination with a `page` state variable and slice the `filtered` array accordingly:

```jsx
const PAGE_SIZE = 20
const [page, setPage] = useState(1)
const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
```

Or remove the pagination controls entirely until the feature is ready, replacing the footer with a simple count.
