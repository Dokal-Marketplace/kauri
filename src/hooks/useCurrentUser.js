import { useUser } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

/**
 * Returns the authenticated Clerk user merged with their Convex profile,
 * branch, and organization. Safe to call before auth is resolved — check
 * `isLoaded` before reading other fields.
 *
 * @returns {{
 *   isLoaded: boolean,
 *   isSignedIn: boolean,
 *   clerkUser: import('@clerk/clerk-react').UserResource | null | undefined,
 *   convexUser: object | null | undefined,
 *   tenantId: string | null,   // Convex branchId — use for data isolation
 *   orgId: string | null,      // Convex organizationId
 * }}
 */
export function useCurrentUser() {
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser()
  const convexUser = useQuery(
    api.users.currentUser,
    clerkLoaded && isSignedIn ? {} : 'skip',
  )

  const isLoaded = clerkLoaded && convexUser !== undefined

  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    clerkUser: clerkUser ?? null,
    convexUser: convexUser ?? null,
    tenantId: convexUser?.tenantId ?? null,
    orgId: convexUser?.organization?._id ?? null,
  }
}
