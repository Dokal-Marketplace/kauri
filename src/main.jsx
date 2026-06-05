import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient } from 'convex/react'
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
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

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

function SentryUserSync() {
  const { user, isSignedIn } = useUser()
  useEffect(() => {
    if (isSignedIn && user) {
      Sentry.setUser({ id: user.id, email: user.primaryEmailAddress?.emailAddress })
    } else {
      Sentry.setUser(null)
    }
  }, [isSignedIn, user])
  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <SentryUserSync />
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>
)
