import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { wrapCreateBrowserRouterV7 } from '@sentry/react'
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'
import * as Sentry from '@sentry/react'
import { Sidebar } from './components'
import { lazyWithReload } from './utils/lazyWithReload'
import { OnboardingWizard } from './components/OnboardingWizard'
import { useCurrentUser } from './hooks/useCurrentUser'
import { TenantsProvider } from './components/providers/tenant-provider'

const DashboardPage = lazyWithReload(() => import('./pages/DashboardPage'))
const ClientsPage = lazyWithReload(() => import('./pages/ClientsPage'))
const TransactionsPage = lazyWithReload(() => import('./pages/TransactionsPage'))
const AgentsPage = lazyWithReload(() => import('./pages/AgentsPage'))
const ObjectifsPage = lazyWithReload(() => import('./pages/ObjectifsPage'))
const ProductsPage = lazyWithReload(() => import('./pages/ProductsPage'))
const ReconciliationPage = lazyWithReload(() => import('./pages/ReconciliationPage'))
const SettingsPage = lazyWithReload(() => import('./pages/SettingsPage'))
const DisbursementsPage = lazyWithReload(() => import('./pages/DisbursementsPage'))

// ─── Error fallbacks ───────────────────────────────────────────────────────────
function PageErrorFallback({ eventId }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Cette page a rencontré une erreur.</p>
      {eventId && <p style={{ fontSize: '0.75rem', color: '#888' }}>Référence&nbsp;: {eventId}</p>}
      <button onClick={() => window.location.reload()}>Réessayer</button>
    </div>
  )
}

// ─── Layout ────────────────────────────────────────────────────────────────────
function AppShell() {
  const { isLoaded, convexUser } = useCurrentUser()
  if (isLoaded && !convexUser) return <OnboardingWizard />
  return (
    <TenantsProvider
      features={{ members: true, invitations: true, teams: true }}
      onToast={(msg, type) => {
        if (import.meta.env.DEV) console[type === 'error' ? 'error' : 'log']('[tenant]', msg)
      }}
    >
      <div className="app">
        <Sidebar />
        <main className="main">
          <Sentry.ErrorBoundary fallback={PageErrorFallback} showDialog>
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </Sentry.ErrorBoundary>
        </main>
      </div>
    </TenantsProvider>
  )
}

function Layout() {
  return (
    <>
      <SignedIn>
        <AppShell />
      </SignedIn>

      <SignedOut>
        <div className="auth-gate">
          <SignIn routing="hash" />
        </div>
      </SignedOut>
    </>
  )
}

// ─── Router ────────────────────────────────────────────────────────────────────
const createSentryRouter = wrapCreateBrowserRouterV7(createBrowserRouter)
const router = createSentryRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'tx', element: <TransactionsPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'objectifs', element: <ObjectifsPage /> },
      { path: 'produits', element: <ProductsPage /> },
      { path: 'reconciliation', element: <ReconciliationPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'decaissements', element: <DisbursementsPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
