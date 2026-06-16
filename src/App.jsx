import { Component, Suspense, useState } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { wrapCreateBrowserRouterV7 } from '@sentry/react'
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import * as Sentry from '@sentry/react'
import { Sidebar } from './components'
import { lazyWithReload } from './utils/lazyWithReload'
import { OnboardingWizard } from './components/OnboardingWizard'
import { useCurrentUser } from './hooks/useCurrentUser'
import { TenantsProvider } from './components/providers/tenant-provider'
import { agentConvex } from './convexClients'

const AgentLoginPage = lazyWithReload(() => import('./pages/AgentLoginPage'))
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

// ─── Error boundary ────────────────────────────────────────────────────────────
class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Cette page n&apos;a pas pu se charger.</p>
          <button onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Layout ────────────────────────────────────────────────────────────────────
function AppShell() {
  const { isLoaded, convexUser } = useCurrentUser()
  if (isLoaded && !convexUser) return <OnboardingWizard />
  return (
    <TenantsProvider
      features={{ members: true, invitations: true, teams: true }}
      onToast={(msg, type) => {
        if (import.meta.env.DEV) {
          if (type === 'error') console.error('[tenant]', msg)
          else console.warn('[tenant]', msg)
        }
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

// Layout for agents authenticated via @convex-dev/auth (Password provider)
function AgentLayout() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  if (isLoading) return null
  if (!isAuthenticated) {
    sessionStorage.removeItem('kauri_auth_mode')
    return <Navigate to="/connexion" replace />
  }
  return <AppShell />
}

function Layout() {
  const [isAgentMode] = useState(() => sessionStorage.getItem('kauri_auth_mode') === 'agent')

  if (isAgentMode) return <AgentLayout />

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
    // Agent login — has its own ConvexAuthProvider so signIn/signOut work
    // before the main ConvexWrapper has switched to agent mode.
    path: '/connexion',
    element: (
      <ConvexAuthProvider client={agentConvex}>
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <AgentLoginPage />
          </Suspense>
        </ChunkErrorBoundary>
      </ConvexAuthProvider>
    ),
  },
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

// Render binding flow as a full-screen modal when an agent has no device
// We wrap BindDeviceDrawer via lazyWithReload and export a small helper
// Note: the router's Layout renders AppShell which reads `useCurrentUser`.
