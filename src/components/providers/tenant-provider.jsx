import { useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useCurrentUser } from "../../hooks/useCurrentUser.js";
import { TenantsDataContext, TenantsActionsContext } from "./tenant-context.jsx";

const EMPTY_MEMBERS = [];
const EMPTY_INVITATIONS = [];
const EMPTY_TEAMS = [];

function toArray(raw) {
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? raw : raw.page;
}

// ============================================================================
// Inner provider — only rendered when all required api refs are present.
// All hooks are called unconditionally here, which satisfies React's rules.
// ============================================================================

function TenantsProviderInner({ api, children, onToast, features }) {
  const { userId, orgId, branchId, convexUser } = useCurrentUser();

  const membersEnabled = features?.members ?? true;
  const invitationsEnabled = features?.invitations ?? true;
  const teamsEnabled = features?.teams ?? true;

  const currentOrganization = convexUser?.organization ?? null;

  // ── Queries ───────────────────────────────────────────────────────────────

  const membersRaw = useQuery(
    api.listOrganizationMembers,
    membersEnabled && orgId ? { organizationId: orgId } : "skip"
  );
  const members = useMemo(() => {
    if (!membersEnabled) return EMPTY_MEMBERS;
    return toArray(membersRaw) ?? EMPTY_MEMBERS;
  }, [membersRaw, membersEnabled]);

  const invitationsRaw = useQuery(
    api.listInvitations,
    invitationsEnabled && orgId ? { organizationId: orgId } : "skip"
  );
  const invitations = useMemo(() => {
    if (!invitationsEnabled) return EMPTY_INVITATIONS;
    return toArray(invitationsRaw) ?? EMPTY_INVITATIONS;
  }, [invitationsRaw, invitationsEnabled]);

  const teamsRaw = useQuery(
    api.listTeams,
    teamsEnabled && orgId ? { organizationId: orgId } : "skip"
  );
  const teams = useMemo(() => {
    if (!teamsEnabled) return EMPTY_TEAMS;
    return toArray(teamsRaw) ?? EMPTY_TEAMS;
  }, [teamsRaw, teamsEnabled]);

  // ── Loading States ────────────────────────────────────────────────────────

  const isOrganizationsLoading = convexUser === undefined;
  const isMembersLoading = membersEnabled && !!orgId && membersRaw === undefined;
  const isInvitationsLoading = invitationsEnabled && !!orgId && invitationsRaw === undefined;
  const isTeamsLoading = teamsEnabled && !!orgId && teamsRaw === undefined;
  const isLoading = isOrganizationsLoading || isMembersLoading || isInvitationsLoading || isTeamsLoading;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const removeMemberMutation = useMutation(api.removeMember);
  const updateMemberRoleMutation = useMutation(api.updateMemberRole);
  const inviteMemberMutation = useMutation(api.inviteMember);
  const resendInvitationMutation = useMutation(api.resendInvitation);
  const cancelInvitationMutation = useMutation(api.cancelInvitation);
  const createTeamMutation = useMutation(api.createTeam);
  const deleteTeamMutation = useMutation(api.deleteTeam);
  const addTeamMemberMutation = useMutation(api.addTeamMember);
  const removeTeamMemberMutation = useMutation(api.removeTeamMember);
  // Optional — use the required ref as a fallback so useMutation is always called
  // with a valid reference; the action handler guards against calling it.
  const suspendMemberMutation = useMutation(api.suspendMember ?? api.removeMember);
  const unsuspendMemberMutation = useMutation(api.unsuspendMember ?? api.removeMember);

  // ── Action Handlers ───────────────────────────────────────────────────────

  const removeMember = useCallback(async (memberUserId) => {
    if (!userId || !orgId) throw new Error("Not authenticated");
    try {
      await removeMemberMutation({ userId, organizationId: orgId, memberUserId });
      onToast?.("Member removed successfully", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to remove member", "error");
      throw error;
    }
  }, [userId, orgId, removeMemberMutation, onToast]);

  const updateMemberRole = useCallback(async (memberUserId, role) => {
    if (!userId || !orgId) throw new Error("Not authenticated");
    try {
      await updateMemberRoleMutation({ userId, organizationId: orgId, memberUserId, role });
      onToast?.("Member role updated", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to update member role", "error");
      throw error;
    }
  }, [userId, orgId, updateMemberRoleMutation, onToast]);

  const suspendMember = useCallback(async (memberUserId) => {
    if (!userId || !orgId || !api.suspendMember) throw new Error("Not available");
    try {
      await suspendMemberMutation({ userId, organizationId: orgId, memberUserId });
      onToast?.("Member suspended", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to suspend member", "error");
      throw error;
    }
  }, [userId, orgId, api.suspendMember, suspendMemberMutation, onToast]);

  const unsuspendMember = useCallback(async (memberUserId) => {
    if (!userId || !orgId || !api.unsuspendMember) throw new Error("Not available");
    try {
      await unsuspendMemberMutation({ userId, organizationId: orgId, memberUserId });
      onToast?.("Member unsuspended", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to unsuspend member", "error");
      throw error;
    }
  }, [userId, orgId, api.unsuspendMember, unsuspendMemberMutation, onToast]);

  const inviteMember = useCallback(async (data) => {
    if (!userId || !orgId) throw new Error("Not authenticated");
    try {
      const result = await inviteMemberMutation({ userId, organizationId: orgId, ...data });
      onToast?.("Invitation sent successfully!", "success");
      return result;
    } catch (error) {
      onToast?.(error.message || "Failed to send invitation", "error");
      throw error;
    }
  }, [userId, orgId, inviteMemberMutation, onToast]);

  const resendInvitation = useCallback(async (invitationId) => {
    if (!userId) throw new Error("Not authenticated");
    try {
      await resendInvitationMutation({ userId, invitationId });
      onToast?.("Invitation resent", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to resend invitation", "error");
      throw error;
    }
  }, [userId, resendInvitationMutation, onToast]);

  const cancelInvitation = useCallback(async (invitationId) => {
    if (!userId) throw new Error("Not authenticated");
    try {
      await cancelInvitationMutation({ userId, invitationId });
      onToast?.("Invitation cancelled", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to cancel invitation", "error");
      throw error;
    }
  }, [userId, cancelInvitationMutation, onToast]);

  const createTeam = useCallback(async (data) => {
    if (!userId || !orgId) throw new Error("Not authenticated");
    try {
      const teamId = await createTeamMutation({ userId, organizationId: orgId, ...data });
      onToast?.("Team created", "success");
      return teamId;
    } catch (error) {
      onToast?.(error.message || "Failed to create team", "error");
      throw error;
    }
  }, [userId, orgId, createTeamMutation, onToast]);

  const deleteTeam = useCallback(async (teamId) => {
    if (!userId) throw new Error("Not authenticated");
    try {
      await deleteTeamMutation({ userId, teamId });
      onToast?.("Team deleted", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to delete team", "error");
      throw error;
    }
  }, [userId, deleteTeamMutation, onToast]);

  const addTeamMember = useCallback(async (memberUserId, teamId) => {
    if (!userId) throw new Error("Not authenticated");
    try {
      await addTeamMemberMutation({ userId, teamId, memberUserId });
      onToast?.("Member added to team", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to add member to team", "error");
      throw error;
    }
  }, [userId, addTeamMemberMutation, onToast]);

  const removeTeamMember = useCallback(async (memberUserId, teamId) => {
    if (!userId) throw new Error("Not authenticated");
    try {
      await removeTeamMemberMutation({ userId, teamId, memberUserId });
      onToast?.("Member removed from team", "success");
    } catch (error) {
      onToast?.(error.message || "Failed to remove member from team", "error");
      throw error;
    }
  }, [userId, removeTeamMemberMutation, onToast]);

  // ── Context Values ────────────────────────────────────────────────────────

  const dataValue = useMemo(() => ({
    currentOrganization,
    members,
    invitations,
    teams,
    isLoading,
    isOrganizationsLoading,
    isMembersLoading,
    isInvitationsLoading,
    isTeamsLoading,
    currentRole: convexUser?.role ?? null,
    userId: userId ?? null,
    branchId: branchId ?? null,
  }), [
    currentOrganization, members, invitations, teams,
    isLoading, isOrganizationsLoading, isMembersLoading, isInvitationsLoading, isTeamsLoading,
    convexUser, userId, branchId,
  ]);

  const actionsValue = useMemo(() => ({
    removeMember,
    updateMemberRole,
    ...(api.suspendMember ? { suspendMember } : {}),
    ...(api.unsuspendMember ? { unsuspendMember } : {}),
    inviteMember,
    resendInvitation,
    cancelInvitation,
    createTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
    onToast,
  }), [
    removeMember, updateMemberRole, suspendMember, unsuspendMember,
    inviteMember, resendInvitation, cancelInvitation,
    createTeam, deleteTeam, addTeamMember, removeTeamMember,
    onToast, api.suspendMember, api.unsuspendMember,
  ]);

  return (
    <TenantsDataContext.Provider value={dataValue}>
      <TenantsActionsContext.Provider value={actionsValue}>
        {children}
      </TenantsActionsContext.Provider>
    </TenantsDataContext.Provider>
  );
}

// ============================================================================
// Public provider — guards missing api so the inner component (with all hooks)
// is only mounted when the required Convex function references are available.
// This lets App.jsx mount <TenantsProvider> before convex/members.ts and
// convex/teams.ts exist; add the api prop once those files are in place.
// ============================================================================

/**
 * TenantsProvider — provides org/member/team/invitation context to children.
 *
 * Props:
 *   api       — Convex function refs (required once backend files exist):
 *                 { listOrganizationMembers, removeMember, updateMemberRole,
 *                   listInvitations, inviteMember, resendInvitation, cancelInvitation,
 *                   listTeams, createTeam, deleteTeam, addTeamMember, removeTeamMember,
 *                   suspendMember? (optional), unsuspendMember? (optional) }
 *   onToast   — (message, type) callback for success/error notifications
 *   features  — { members?, invitations?, teams? } booleans to disable eager queries
 *   children  — React children
 */
export function TenantsProvider({ api, children, onToast, features }) {
  const hasApi =
    api &&
    api.listOrganizationMembers &&
    api.removeMember &&
    api.listInvitations &&
    api.inviteMember &&
    api.listTeams &&
    api.createTeam;

  if (!hasApi) {
    // Render children without tenant context until the api is wired up.
    // TODO: pass api prop once convex/members.ts and convex/teams.ts are added.
    return children;
  }

  return (
    <TenantsProviderInner api={api} onToast={onToast} features={features}>
      {children}
    </TenantsProviderInner>
  );
}
