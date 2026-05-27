import { useCurrentUser } from './useCurrentUser'

/**
 * Returns the current user's branch ID.
 * Returns null if auth is not loaded or user has no branch.
 */
export function useCurrentBranch() {
  const { isLoaded, convexUser } = useCurrentUser()
  
  if (!isLoaded || !convexUser) return null
  
  return convexUser.branchId
}
