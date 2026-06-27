// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import * as Sentry from '@sentry/react'
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={AppCrashFallback}>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
)
