---
title: "[Architecture] No router — pages are not URL-addressable"
labels: architecture, enhancement
priority: low
---

## Description

Navigation is handled entirely via a `useState` in `App.jsx`:

```jsx
// src/App.jsx:22-25
export default function App() {
  const [active, setActive] = useState('dashboard')
  const Page = PAGES[active] ?? DashboardPage
  ...
}
```

There is no URL router, so the application has no concept of routes.

## Impact

- **No deep linking** — sharing a link to the Transactions or Clients page is impossible; all links land on the dashboard.
- **Browser back/forward buttons don't work** — navigating between pages doesn't update history.
- **No bookmarking** — users cannot bookmark specific pages.
- **No page-level code splitting** — all pages are bundled together regardless of which is visited.

## Suggested Fix

Introduce a client-side router. For a Vite + React app, [React Router v7](https://reactrouter.com/) or [TanStack Router](https://tanstack.com/router) are the standard choices:

```jsx
// With React Router
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const router = createBrowserRouter([
  { path: "/",            element: <Layout />, children: [
    { index: true,        element: <DashboardPage /> },
    { path: "clients",    element: <ClientsPage /> },
    { path: "tx",         element: <TransactionsPage /> },
    { path: "agents",     element: <AgentsPage /> },
    { path: "objectifs",  element: <ObjectifsPage /> },
    { path: "produits",   element: <ProductsPage /> },
    { path: "settings",   element: <SettingsPage /> },
  ]},
])
```

This change also enables lazy loading each page with `React.lazy`.
