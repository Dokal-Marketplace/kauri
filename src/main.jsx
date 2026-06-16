import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import * as Sentry from '@sentry/react'
import { SentryUserSync } from './components/SentryUserSync'
import { adminConvex, agentConvex } from './convexClients'
import './styles.css'
import App from './App'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
})

window.addEventListener('unhandledrejection', (event) => {
  Sentry.captureException(event.reason)
})

function AppCrashFallback({ eventId }) {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <p>L&apos;application a rencontré une erreur inattendue.</p>
      {eventId && <p style={{ fontSize: '0.75rem', color: '#888' }}>Référence&nbsp;: {eventId}</p>}
      <button onClick={() => window.location.reload()}>Recharger</button>
    </div>
  )
}

// Reads auth mode once at mount — requires a full page reload to switch modes.
// Agent sign-in sets sessionStorage 'kauri_auth_mode' = 'agent', then reloads.
// Agent sign-out clears it and reloads to /connexion.
function ConvexWrapper({ children }) {
  const [isAgentMode] = useState(() => sessionStorage.getItem('kauri_auth_mode') === 'agent')

  if (isAgentMode) {
    return <ConvexAuthProvider client={agentConvex}>{children}</ConvexAuthProvider>
  }

  return (
    <ConvexProviderWithClerk client={adminConvex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={AppCrashFallback}>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
        <ConvexWrapper>
          <SentryUserSync />
          <App />
        </ConvexWrapper>
      </ClerkProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
)
