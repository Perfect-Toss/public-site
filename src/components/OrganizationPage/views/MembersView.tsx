import { faPlus, faSpinner, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { User } from '../../../api/api';
import { fetchAllUsers, addUserToEntity, removeUserFromEntity } from '../../../api/api';
import { useOutletContext } from 'react-router-dom';
import type { OrganizationPageContext } from '../OrganizationPage';

function MembersView() {
  const { organization, isAdmin } = useOutletContext<OrganizationPageContext>();

  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add member form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!organization.id) return;
    loadMembers();
  }, [organization.id]);

  async function loadMembers() {
    setLoading(true);
    setError(null);
    try {
      // The entity members come from the entity's users collection
      // Using fetchAllUsers as a fallback since there's no direct "get entity members" endpoint exposed
      // TODO: Replace with a dedicated entity-members endpoint when available
      const users = await fetchAllUsers();
      // Filter to members of this entity if the user objects carry entity references
      // For now, show all users (admin-only view)
      setMembers(users as User[]);
    } catch {
      setError('Failed to load members.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenAddForm() {
    setShowAddForm(true);
    if (allUsers.length === 0) {
      const users = await fetchAllUsers();
      setAllUsers(users as User[]);
    }
  }

  async function handleAddMember() {
    if (!organization.id || !selectedUserId) return;
    setAdding(true);
    try {
      await addUserToEntity(organization.id, selectedUserId, { roles: [] });
      setShowAddForm(false);
      setSelectedUserId('');
      await loadMembers();
    } catch {
      // silently surface via UI in future
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!organization.id) return;
    if (!confirm('Remove this member from the organization?')) return;
    try {
      await removeUserFromEntity(organization.id, userId);
      setMembers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      // TODO: show toast
    }
  }

  const getDisplayName = (u: User) => {
    const full = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return full || u.email || u.id || '—';
  };

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FontAwesomeIcon icon={faUsers} />
          Members
        </h2>
        {isAdmin && !showAddForm && (
          <button className="primary-btn icon-only-btn" onClick={handleOpenAddForm} title="Add Member">
            <FontAwesomeIcon icon={faPlus} />
          </button>
        )}
      </div>

      {isAdmin && showAddForm && (
        <div className="info-card" style={{ marginBottom: 20 }}>
          <div className="edit-form">
            <div className="form-field">
              <label>Select User</label>
              <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                <option value="">— choose a user —</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id ?? ''}>
                    {getDisplayName(u)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button className="primary-btn" style={{ padding: '9px 18px', fontSize: 13 }} onClick={handleAddMember} disabled={adding || !selectedUserId}>
                {adding ? 'Adding…' : 'Add Member'}
              </button>
              <button className="secondary-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
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
          <h3>No members yet</h3>
          <p>Add users to this organization to get started.</p>
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
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="member-name">{getDisplayName(member)}</td>
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
