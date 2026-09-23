import { faSpinner, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { RoleMemberPicker } from '../../common';
import type { OrganizationPageContext } from '../OrganizationPage';
import { Role, type User } from '../../../api/api.users';
import { hasRole } from '../../../utils/user';
import { useEntityStore } from '../../../stores/entityStore';

function MembersView() {
  const { organization, isAdmin } = useOutletContext<OrganizationPageContext>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { entityUsers, loadEntityUsers, removeUserFromEntity } = useEntityStore();

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadEntityUsers(organization.id);
    } catch {
      setError('Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, [organization.id, loadEntityUsers]);

  useEffect(() => {
    if (!organization.id) return;
    loadMembers();
  }, [organization.id, loadMembers]);

  // This tab is the athlete roster; staff roles are granted on the Settings tab.
  const members = useMemo(
    () =>
      (entityUsers[organization.id] ?? []).filter((member) => hasRole(member.roles, Role.Athlete)),
    [entityUsers, organization.id],
  );

  async function handleRemoveMember(userId: string) {
    if (!organization.id) return;
    if (!confirm('Remove this member from the organization?')) return;
    try {
      await removeUserFromEntity(organization.id, userId);
    } catch {
      // TODO: show toast
    }
  }

  const getDisplayName = (u: User) => {
    const full = [u.lastName, u.firstName].filter(Boolean).join(', ');
    if (full && u.email) return `${full} (${u.email})`;
    return full || u.email || u.id || '—';
  };

  const sortUsers = (users: User[]) =>
    [...users].sort((a, b) => {
      const lastName = (a.lastName ?? '').localeCompare(b.lastName ?? '');
      if (lastName !== 0) return lastName;
      const firstName = (a.firstName ?? '').localeCompare(b.firstName ?? '');
      if (firstName !== 0) return firstName;
      return (a.email ?? '').localeCompare(b.email ?? '');
    });

  return (
    <div>
      {/* Adding athletes sits above the roster, so it is always in reach. */}
      {isAdmin && (
        <div className="info-card" style={{ marginBottom: 20 }}>
          <RoleMemberPicker
            id="add-member-picker"
            organizationId={organization.id}
            role={Role.Athlete}
            label="Athletes"
            placeholder="Add athletes"
            filterByOverallRole={false}
            emptyMessage="Every user is already a member."
            showMembers={false}
          />
        </div>
      )}

      {loading && (
        <div className="empty-state-large">
          <FontAwesomeIcon icon={faSpinner} size="2x" spin style={{ opacity: 0.5 }} />
          <p>Loading members...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state-large">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <div className="empty-state-large">
          <FontAwesomeIcon icon={faUsers} size="3x" style={{ opacity: 0.2 }} />
          <h3>No athletes yet</h3>
          <p>Add athletes to this organization to get started.</p>
        </div>
      )}

      {!loading && !error && members.length > 0 && (
        <div className="members-table-wrap">
          <table className="members-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                {isAdmin && <th style={{ width: 80 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sortUsers(members).map((member) => (
                <tr key={member.id}>
                  <td
                    className="member-name"
                    onClick={() => navigate(`/admin/users/${member.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {getDisplayName(member)}
                  </td>
                  <td className="member-email">{member.email || '—'}</td>
                  <td>
                    <span className="role-badge">{member.roles?.join(', ') || 'Member'}</span>
                  </td>
                  {isAdmin && (
                    <td>
                      <button
                        className="danger-btn"
                        onClick={() => handleRemoveMember(member.id!)}
                        title="Remove member"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MembersView;
