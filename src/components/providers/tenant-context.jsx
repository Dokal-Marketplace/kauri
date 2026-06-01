import { createContext, useContext } from 'react'

// ============================================================================
// Contexts
// ============================================================================

export const TenantsDataContext = createContext(null)
export const TenantsActionsContext = createContext(null)

export function useTenantsData() {
  const context = useContext(TenantsDataContext)
  if (!context) {
    throw new Error(
      'useTenantsData must be used within a TenantsProvider. ' +
        'Wrap your app with <TenantsProvider api={...}>...</TenantsProvider>'
    )
  }
  return context
}

export function useTenantsActions() {
  const context = useContext(TenantsActionsContext)
  if (!context) {
    throw new Error(
      'useTenantsActions must be used within a TenantsProvider. ' +
        'Wrap your app with <TenantsProvider api={...}>...</TenantsProvider>'
    )
  }
  return context
}

/**
 * Returns combined data + actions. Prefer `useTenantsData` or
 * `useTenantsActions` when you only need one slice.
 *
 * Data shape: { currentOrganization, members, invitations, teams,
 *   isLoading, isOrganizationsLoading, isMembersLoading, isInvitationsLoading,
 *   isTeamsLoading, currentRole, userId, branchId }
 *
 * Actions shape: { removeMember, updateMemberRole, suspendMember?, unsuspendMember?,
 *   inviteMember, resendInvitation, cancelInvitation,
 *   createTeam, deleteTeam, addTeamMember, removeTeamMember, onToast? }
 */
export function useTenants() {
  const data = useTenantsData()
  const actions = useTenantsActions()
  return { ...data, ...actions }
}
