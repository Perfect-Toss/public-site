import './RoleMemberPicker.css';

import { getDisplayName, hasRole, sortUsersByName } from '../../utils/user';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Role } from '../../api/api.users';
import { UserAvatar } from './UserAvatar';
import { UserPicker } from './UserPicker';
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
  const { entityUsers, loadEntityUsers, addUserToEntity } = useEntityStore();

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
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
              </li>
            ))
          )}
        </ul>
      )}
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
    </div>
  );
}
