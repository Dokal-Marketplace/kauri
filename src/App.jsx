// src/App.jsx
import { Component, Suspense, useEffect, useState } from 'react'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { wrapCreateBrowserRouterV7 } from '@sentry/react'
import { SignedIn, SignedOut, SignIn, useAuth } from '@clerk/clerk-react'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import * as Sentry from '@sentry/react'
import { Sidebar } from './components'
import { lazyWithReload } from './utils/lazyWithReload'
import { OnboardingWizard } from './components/OnboardingWizard'
import { useCurrentUser } from './hooks/useCurrentUser'
import { TenantsProvider } from './components/providers/tenant-provider'
import { SentryUserSync } from './components/SentryUserSync'
import ChangePasswordPage from './pages/ChangePasswordPage'

const DashboardPage = lazyWithReload(() => import('./pages/DashboardPage'))
const ClientsPage = lazyWithReload(() => import('./pages/ClientsPage'))
const TransactionsPage = lazyWithReload(() => import('./pages/TransactionsPage'))
const AgentsPage = lazyWithReload(() => import('./pages/AgentsPage'))
const ObjectifsPage = lazyWithReload(() => import('./pages/ObjectifsPage'))
const ProductsPage = lazyWithReload(() => import('./pages/ProductsPage'))
const ReconciliationPage = lazyWithReload(() => import('./pages/ReconciliationPage'))
const SettingsPage = lazyWithReload(() => import('./pages/SettingsPage'))
const DisbursementsPage = lazyWithReload(() => import('./pages/DisbursementsPage'))
const FleetPage = lazyWithReload(() => import('./pages/FleetPage'))
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

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

const BindDeviceLazy = lazyWithReload(() =>
  import('./pages/BindDeviceDrawer').then((m) => ({ default: m.BindDeviceDrawer }))
)

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

// ─── AppShell — utilise useCurrentUser, doit être sous ConvexProvider ─────────
function AppShell() {
  const { isLoaded, convexUser } = useCurrentUser()
  const [now, setNow] = useState(null)

  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    const timeoutId = window.setTimeout(updateNow, 0)
    const intervalId = window.setInterval(updateNow, 60 * 1000)
    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [])

  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000
  const isPasswordExpired =
    isLoaded &&
    Boolean(convexUser?.passwordSetAt) &&
    now !== null &&
    now - convexUser.passwordSetAt > THREE_DAYS

  const isLocked =
    isLoaded && Boolean(convexUser?.lockedUntil) && now !== null && now < convexUser.lockedUntil

  if (isLoaded && !convexUser) return <OnboardingWizard />

  if (isLoaded && convexUser?.mustChangePassword) {
    return <ChangePasswordPage reason="required" />
  }

  if (isLocked) {
    const remaining = Math.ceil((convexUser.lockedUntil - now) / 60_000)
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <p>Votre compte est temporairement verrouillé suite à plusieurs tentatives échouées.</p>
        <p style={{ fontSize: '0.875rem', color: '#888' }}>
          Réessayez dans {remaining} minute{remaining > 1 ? 's' : ''}.
        </p>
      </div>
    )
  }

  if (isLoaded && isPasswordExpired) {
    return <ChangePasswordPage reason="expired" />
  }

  if (isLoaded && convexUser && convexUser.role === 'agent' && convexUser.device === null) {
    return (
      <ChunkErrorBoundary>
        <Suspense fallback={null}>
          <BindDeviceLazy
            agent={convexUser}
            tenantId={convexUser.tenantId}
            isLoaded={isLoaded}
            onClose={() => window.location.reload()}
          />
        </Suspense>
      </ChunkErrorBoundary>
    )
  }

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

// ─── Layout — ConvexProviderWithClerk ICI, au-dessus de AppShell ──────────────
function Layout() {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <SentryUserSync />
      <SignedIn>
        <AppShell />
      </SignedIn>
      <SignedOut>
        <div className="auth-gate">
          <SignIn routing="hash" />
        </div>
      </SignedOut>
    </ConvexProviderWithClerk>
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
      { path: 'fleet', element: <FleetPage /> },
      { path: 'objectifs', element: <ObjectifsPage /> },
      { path: 'produits', element: <ProductsPage /> },
      { path: 'reconciliation', element: <ReconciliationPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'decaissements', element: <DisbursementsPage /> },
    ],
  },
])

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return <RouterProvider router={router} />
}
