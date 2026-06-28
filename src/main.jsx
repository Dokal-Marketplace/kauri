import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import * as Sentry from '@sentry/react'
import './styles.css'
import App from './App'
import AppCrashFallback from './components/AppCrashFallback'

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={AppCrashFallback}>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
)
