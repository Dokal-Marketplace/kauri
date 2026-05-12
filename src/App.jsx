import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'
import { Sidebar } from './components'
import AppCommandPalette from './components/CommandPalette'

const DashboardPage      = lazy(() => import('./pages/DashboardPage'))
const ClientsPage        = lazy(() => import('./pages/ClientsPage'))
const TransactionsPage   = lazy(() => import('./pages/TransactionsPage'))
const AgentsPage         = lazy(() => import('./pages/AgentsPage'))
const ObjectifsPage      = lazy(() => import('./pages/ObjectifsPage'))
const ProductsPage       = lazy(() => import('./pages/ProductsPage'))
const ReconciliationPage = lazy(() => import('./pages/ReconciliationPage'))
const SettingsPage       = lazy(() => import('./pages/SettingsPage'))

function Layout() {
  return (
    <>
      <SignedIn>
        <div className="app">
          <Sidebar />
          <main className="main">
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </main>
          <AppCommandPalette />
        </div>
      </SignedIn>

      <SignedOut>
        <div className="auth-gate">
          <SignIn routing="hash" />
        </div>
      </SignedOut>
    </>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true,             element: <DashboardPage /> },
      { path: 'clients',         element: <ClientsPage /> },
      { path: 'tx',              element: <TransactionsPage /> },
      { path: 'agents',          element: <AgentsPage /> },
      { path: 'objectifs',       element: <ObjectifsPage /> },
      { path: 'produits',        element: <ProductsPage /> },
      { path: 'reconciliation',  element: <ReconciliationPage /> },
      { path: 'settings',        element: <SettingsPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
