import { useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import * as Sentry from '@sentry/react'

export function SentryUserSync() {
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
