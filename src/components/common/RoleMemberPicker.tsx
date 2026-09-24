import './RoleMemberPicker.css';

import type { Role, User } from '../../api/api.users';
import { getDisplayName, hasRole, sortUsersByName } from '../../utils/user';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { UserAvatar } from './UserAvatar';
import { UserPicker } from './UserPicker';
import { canAssignRole } from '../../utils/roles';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/useAuth';
import { useEntityStore } from '../../stores/entityStore';
import { useUserStore } from '../../stores/userStore';

export interface RoleMemberPickerProps {
  /** Organization the picked users join. */
  organizationId: string;
  /** The role they are given on it. */
  role: Role;
  /** Plural label for the people this picker adds, e.g. "Coaches". */
  label: string;
  placeholder: string;
  searchPlaceholder?: string;
  /**
   * Offer only the users who already hold `role` overall. Defaults to true —
   * staff roles are drawn from the global pool of people who have them, whereas
   * the athlete role is granted per organization to anyone.
   */
  filterByOverallRole?: boolean;
  /** Wording for an empty list. */
  emptyMessage?: string;
  /** List the members who already hold the role above the picker. */
  showMembers?: boolean;
  id?: string;
}

/**
 * Gives users a role on one organization.
 *
 * By default the list is the overall holders of that role (`filterByOverallRole`),
 * because coaches, admins and service accounts are people who already have the
 * role on their account and are then attached to an organization. Turn that off
 * for a role anyone may be given on this organization, such as an athlete.
 *
 * Either way the grant is organization-scoped — `POST /entities/{id}/users/{userId}`
 * records it on the membership, so nobody's account-wide roles are touched.
 */
export function RoleMemberPicker({
  organizationId,
  role,
  label,
  placeholder,
  searchPlaceholder = 'Search by name or email...',
  filterByOverallRole = true,
  emptyMessage = filterByOverallRole
    ? `No ${label.toLowerCase()} left to add.`
    : 'No users left to add.',
  showMembers = true,
  id,
}: RoleMemberPickerProps) {
  const { users, loadUsers } = useUserStore();
  const { entityUsers, loadEntityUsers, addUserToEntity, updateEntityUserRoles, removeUserFromEntity } =
    useEntityStore();
  const { currentUser } = useAuth();

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadEntityUsers(organizationId);
  }, [loadEntityUsers, organizationId]);

  /** Members can't be added twice, so the picker lists everyone else. */
  const candidates = useMemo(() => {
    const memberIds = new Set((entityUsers[organizationId] ?? []).map((member) => member.id));
    return users.filter((user) => !memberIds.has(user.id));
  }, [users, entityUsers, organizationId]);

  /** The organization's members who hold this role — i.e. who it was given to. */
  const assignedMembers = useMemo(
    () =>
      sortUsersByName(
        (entityUsers[organizationId] ?? []).filter((member) => hasRole(member.roles, role)),
      ),
    [entityUsers, organizationId, role],
  );

  /**
   * The acting user's authority here: their global roles plus whatever they hold
   * on this organization. A role above their level is off limits.
   */
  const canAssign = useMemo(() => {
    const ownRoles = currentUser?.id
      ? (entityUsers[organizationId] ?? []).find((member) => member.id === currentUser.id)?.roles
      : null;
    return canAssignRole([...(currentUser?.roles ?? []), ...(ownRoles ?? [])], role);
  }, [currentUser, entityUsers, organizationId, role]);
  const handleAdd = useCallback(async () => {
    if (selectedUserIds.length === 0) return;
    setAdding(true);
    setError(null);

    try {
      await Promise.all(
        selectedUserIds.map((userId) => addUserToEntity(organizationId, userId, { roles: [role] })),
      );
      setSelectedUserIds([]);
      await loadEntityUsers(organizationId);
    } catch {
      setError(`Could not add those ${label.toLowerCase()}. Please try again.`);
    } finally {
      setAdding(false);
    }
  }, [selectedUserIds, addUserToEntity, organizationId, role, label, loadEntityUsers]);

  /**
   * Drops this role off the member and keeps the roles they hold on the
   * organization. Only the last role takes the membership itself with it,
   * since the pickers leave members out and nobody could re-add them.
   */
  const handleRemove = useCallback(async (member: User) => {
    const name = getDisplayName(member);
    const remainingRoles = (member.roles ?? []).filter((memberRole) => memberRole !== role);
    const keepsOtherRoles = remainingRoles.length > 0;

    const confirmed = confirm(
      keepsOtherRoles
        ? `Remove ${name} as a ${role}? They keep their other roles on this organization.`
        : `Remove ${name} from this organization? ${role} is the only role they hold on it.`,
    );
    if (!confirmed) return;

    setRemovingId(member.id);
    setError(null);
    try {
      const saved = keepsOtherRoles
        ? await updateEntityUserRoles(organizationId, member.id, { roles: remainingRoles })
        : await removeUserFromEntity(organizationId, member.id);
      if (!saved) throw new Error('failed');
    } catch {
      setError(`Could not remove ${name}. Please try again.`);
    } finally {
      setRemovingId(null);
    }
  }, [organizationId, role, updateEntityUserRoles, removeUserFromEntity]);

  const labelText = selectedUserIds.length > 1
    ? `Add ${selectedUserIds.length} ${label}`
    : `Add ${label}`;

  return (
    <div className="rmp-field">
      <label htmlFor={id}>{label}</label>
      {showMembers && (
        <ul className="rmp-members">
          {assignedMembers.length === 0 ? (
            <li className="rmp-members-empty">No {label.toLowerCase()} yet.</li>
          ) : (
            assignedMembers.map((member) => (
              <li key={member.id} className="rmp-member">
                <UserAvatar user={member} size={22} />
                <span className="rmp-member-name">{getDisplayName(member)}</span>
                {member.email ? <span className="rmp-member-email">{member.email}</span> : null}
                {canAssign && (
                  <button
                    type="button"
                    className="rmp-member-remove"
                    aria-label={`Remove ${getDisplayName(member)} from ${label}`}
                    title={`Remove ${getDisplayName(member)} from ${label}`}
                    disabled={removingId === member.id}
                    onClick={() => handleRemove(member)}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      )}
      {/* A role above the acting user's level is theirs to see, not to hand out. */}
      {canAssign ? (
        <>
          <UserPicker
            id={id}
            users={candidates}
            values={selectedUserIds}
            onChange={setSelectedUserIds}
            onlyRoles={filterByOverallRole ? [role] : undefined}
            disabled={adding}
            placeholder={placeholder}
            searchPlaceholder={searchPlaceholder}
            emptyMessage={emptyMessage}
          />
          <div className="rmp-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleAdd}
              disabled={adding || selectedUserIds.length === 0}
            >
              {adding ? 'Adding…' : labelText}
            </button>
            {error && <span className="rmp-error">{error}</span>}
          </div>
        </>
      ) : (
        <p className="rmp-hint">You cannot grant the {role} role here.</p>
      )}
    </div>
  );
}
