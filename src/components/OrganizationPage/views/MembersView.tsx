import { faPlus, faSpinner, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { OrganizationPageContext } from '../OrganizationPage';
import type { User } from '../../../api/api.users';
import { useEntityStore } from '../../../stores/entityStore';
import { useUserStore } from '../../../stores/userStore';
import { useVirtualizer } from '@tanstack/react-virtual';

function MembersView() {
  const { organization, isAdmin } = useOutletContext<OrganizationPageContext>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add member form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userSearch, setUserSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const { entityUsers, loadEntityUsers, addUserToEntity, removeUserFromEntity } = useEntityStore();
  const { users, loadUsers } = useUserStore();

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

  // Load all users for the add-member search
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setAllUsers(users);
  }, [users]);

  // Derive members list from entity users store
  const members = entityUsers[organization.id] ?? [];

  async function handleOpenAddForm() {
    setShowAddForm(true);
    setUserSearch('');
    setSelectedUserIds(new Set());
    if (allUsers.length === 0) {
      loadUsers();
    }
  }

  async function handleAddMember() {
    if (!organization.id || selectedUserIds.size === 0) return;
    setAdding(true);
    try {
      await Promise.all(
        [...selectedUserIds].map((id) => addUserToEntity(organization.id, id, { roles: [] }))
      );
      setShowAddForm(false);
      setSelectedUserIds(new Set());
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

  const ITEM_HEIGHT = 37;
  const LIST_HEIGHT = 200;

  function UserPickerList({ items, selectedIds, onToggle }: { items: User[]; selectedIds: Set<string>; onToggle: (id: string) => void }) {
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
      count: items.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => ITEM_HEIGHT,
      overscan: 5,
    });

    if (items.length === 0) {
      return (
        <div style={{ padding: '8px 12px', color: 'var(--color-text-muted, #888)', fontSize: 13 }}>
          No users found
        </div>
      );
    }

    return (
      <div
        ref={parentRef}
        className="user-search-results"
        style={{ border: '1px solid var(--color-border, #ddd)', borderRadius: 6, marginTop: 4, height: LIST_HEIGHT, overflowY: 'auto' }}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((row) => {
            const u = items[row.index];
            const isSelected = selectedIds.has(u.id ?? '');
            return (
              <div
                key={u.id}
                data-index={row.index}
                ref={virtualizer.measureElement}
                onClick={() => onToggle(u.id ?? '')}
                style={{
                  position: 'absolute',
                  top: row.start,
                  left: 0,
                  right: 0,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: isSelected ? 'var(--color-primary-light, #e8f0fe)' : undefined,
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--color-hover, #f5f5f5)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'var(--color-primary-light, #e8f0fe)' : ''; }}
              >
                <input type="checkbox" readOnly checked={isSelected} style={{ pointerEvents: 'none', flexShrink: 0 }} />
                {getDisplayName(u)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {isAdmin && !showAddForm && (
        <button className="fab" onClick={handleOpenAddForm} title="Add Member">
          <FontAwesomeIcon icon={faPlus} />
        </button>
      )}

      {isAdmin && showAddForm && (
        <div className="info-card" style={{ marginBottom: 20 }}>
          <div className="edit-form">
            <div className="form-field">
              <label>Select User</label>
              {(() => {
                const memberIds = new Set(members.map((m) => m.id));
                const sortedFiltered = sortUsers(
                  allUsers
                    .filter((u) => !memberIds.has(u.id))
                    .filter((u) => {
                      if (!userSearch) return true;
                      const q = userSearch.toLowerCase();
                      return (
                        getDisplayName(u).toLowerCase().includes(q) ||
                        (u.email ?? '').toLowerCase().includes(q)
                      );
                    })
                );
                const selectedUsers = allUsers.filter((u) => selectedUserIds.has(u.id ?? ''));
                return (
                  <>
                    <input
                      type="text"
                      placeholder="Search by name or email…"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      autoFocus
                    />
                    {selectedUsers.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {selectedUsers.map((u) => (
                          <span
                            key={u.id}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 8px', borderRadius: 12, fontSize: 12,
                              background: 'var(--color-primary-light, #e8f0fe)',
                              border: '1px solid var(--color-primary, #4a90d9)',
                            }}
                          >
                            {getDisplayName(u)}
                            <button
                              type="button"
                              onClick={() => setSelectedUserIds((prev) => { const next = new Set(prev); next.delete(u.id ?? ''); return next; })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 13, color: 'inherit' }}
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <UserPickerList
                      items={sortedFiltered}
                      selectedIds={selectedUserIds}
                      onToggle={(id) =>
                        setSelectedUserIds((prev) => {
                          const next = new Set(prev);
                          next.has(id) ? next.delete(id) : next.add(id);
                          return next;
                        })
                      }
                    />
                  </>
                );
              })()}
            </div>
            <div className="form-actions">
              <button className="primary-btn" style={{ padding: '9px 18px', fontSize: 13 }} onClick={handleAddMember} disabled={adding || selectedUserIds.size === 0}>
                {adding ? 'Adding…' : selectedUserIds.size > 1 ? `Add ${selectedUserIds.size} Members` : 'Add Member'}
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
