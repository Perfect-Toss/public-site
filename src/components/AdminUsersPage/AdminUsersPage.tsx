import '../../styles/page.css';
import './AdminUsersPage.css';

import {
  faCheckCircle,
  faFileImport,
  faFilter,
  faPlus,
  faSearch,
  faSort,
  faSortDown,
  faSortUp,
  faSpinner,
  faTimes,
  faTrash,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { getDisplayName, renderRoleBadges } from '../../utils/user';
import { UserInfo } from '../common';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Role, type User } from '../../api/api.users';
import { formatDate } from '../../utils/format';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../stores/userStore';

/* ─── Component ───────────────────────────────────────────────────── */

function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'name' | 'email' | 'status' | 'created'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [roleFilterOpen, setRoleFilterOpen] = useState(false);
  const navigate = useNavigate();
  const { users, usersLoading: loading, usersError: error, loadUsers, deleteUser } = useUserStore();

  /** All roles defined in the API schema */
  const allRoles = Object.values(Role);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /** Returns a numeric value for sorting by status */
  function statusValue(user: User): number {
    if (user.isDeleted) return 2;
    if (user.isEmailVerified) return 0;
    return 1; // pending
  }

  const sortedUsers = useMemo(() => {
    const filtered = users.filter((u) => {
      // Text search
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.firstName ?? '').toLowerCase().includes(q) ||
        (u.lastName ?? '').toLowerCase().includes(q);
      if (!matchesSearch) return false;

      // Role filter
      if (roleFilter.length > 0) {
        const userRoles = u.roles ?? [];
        const hasRole = roleFilter.some((r) => userRoles.includes(r as unknown as Role));
        if (!hasRole) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'name':
          cmp = getDisplayName(a).localeCompare(getDisplayName(b));
          break;
        case 'email':
          cmp = (a.email ?? '').localeCompare(b.email ?? '');
          break;
        case 'status':
          cmp = statusValue(a) - statusValue(b);
          break;
        case 'created':
          cmp = (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [users, searchQuery, sortColumn, sortDirection, roleFilter]);

  /** Toggle sort column/direction */
  const handleSort = (column: 'name' | 'email' | 'status' | 'created') => {
    setSortDirection((prev) => (sortColumn === column && prev === 'asc' ? 'desc' : 'asc'));
    setSortColumn(column);
  };

  const renderSortIcon = (column: 'name' | 'email' | 'status' | 'created') => {
    if (sortColumn !== column) return <FontAwesomeIcon icon={faSort} style={{ marginLeft: 4, opacity: 0.3 }} />;
    return sortDirection === 'asc'
      ? <FontAwesomeIcon icon={faSortUp} style={{ marginLeft: 4 }} />
      : <FontAwesomeIcon icon={faSortDown} style={{ marginLeft: 4 }} />;
  };

  /* ─── Delete User ──────────────────────────────────────────── */

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeleteSubmitting(true);
    try {
      await deleteUser(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      setDeleteConfirm(null);
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteConfirm, deleteUser]);

  /* ─── Render Helpers ───────────────────────────────────────── */

  const renderStatus = (user: User) => {
    if (user.isDeleted) {
      return (
        <span className="status-badge">
          <span className="status-dot inactive" />
          Inactive
        </span>
      );
    }
    if (user.isEmailVerified) {
      return (
        <span className="status-badge">
          <span className="status-dot verified" />
          <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#4caf50', fontSize: 12 }} />
          Verified
        </span>
      );
    }
    return (
      <span className="status-badge">
        <span className="status-dot pending" />
        Pending
      </span>
    );
  };

  /* ─── Render ───────────────────────────────────────────────── */

  return (
    <div className="admin-users-page">
      <section className="section">
        <div className="section-header">
          <h2>User Management</h2>
          <div className="header-actions">
            <button
              className="secondary-btn icon-only-btn"
              onClick={() => navigate('/admin/users/import')}
              title="Bulk Import"
            >
              <FontAwesomeIcon icon={faFileImport} />
            </button>
          </div>
        </div>

        <button className="fab" onClick={() => navigate('/admin/users/new')} title="Add User">
          <FontAwesomeIcon icon={faPlus} />
        </button>

        <div className="table-toolbar">
          <div className="search-box">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          {!loading && !error && (
            <span className="table-result-count">
              {sortedUsers.length} of {users.length} user{sortedUsers.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {loading && (
          <div className="empty-state-large">
            <FontAwesomeIcon icon={faSpinner} size="3x" spin style={{ opacity: 0.5 }} />
            <p>Loading users...</p>
          </div>
        )}
        {!loading && error && (
          <div className="empty-state-large">
            <FontAwesomeIcon icon={faUsers} size="3x" style={{ opacity: 0.3 }} />
            <h3>Failed to load users</h3>
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && (
          <div className="table-wrapper users-table-wrapper">
            <table className="data-table users-table">
              <thead>
                <tr>
                  <th className="sortable-header" onClick={() => handleSort('name')}>
                    User {renderSortIcon('name')}
                  </th>
                  <th className="sortable-header" onClick={() => handleSort('email')}>
                    Email {renderSortIcon('email')}
                  </th>
                  <th className="roles-filter-th">
                    <div className="roles-filter-trigger" onClick={() => setRoleFilterOpen((o) => !o)}>
                      Roles
                      {roleFilter.length > 0 && (
                        <span className="roles-filter-count">{roleFilter.length}</span>
                      )}
                      <FontAwesomeIcon
                        icon={faFilter}
                        style={{ marginLeft: 6, fontSize: 10, opacity: 0.4 }}
                      />
                    </div>
                    {roleFilterOpen && (
                      <>
                        <div className="roles-filter-backdrop" onClick={() => setRoleFilterOpen(false)} />
                        <div className="roles-filter-dropdown">
                          {allRoles.map((role) => (
                            <label key={role} className="roles-filter-option">
                              <input
                                type="checkbox"
                                checked={roleFilter.includes(role)}
                                onChange={() => {
                                  setRoleFilter((prev) =>
                                    prev.includes(role)
                                      ? prev.filter((r) => r !== role)
                                      : [...prev, role],
                                  );
                                }}
                              />
                              <span className={`role-badge ${role.toLowerCase()}`}>{role}</span>
                            </label>
                          ))}
                          {allRoles.length > 0 && (
                            <div className="roles-filter-actions">
                              <button
                                className="roles-filter-btn clear"
                                onClick={() => setRoleFilter([])}
                              >
                                Clear
                              </button>
                            </div>
                          )}
                          {allRoles.length < 1 && (
                            <div className="roles-filter-empty">No roles available</div>
                          )}
                        </div>
                      </>
                    )}
                  </th>
                  <th className="sortable-header" onClick={() => handleSort('status')}>
                    Status {renderSortIcon('status')}
                  </th>
                  <th className="sortable-header" onClick={() => handleSort('created')}>
                    Created {renderSortIcon('created')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: '#999' }}>
                      {searchQuery || roleFilter.length > 0
                        ? 'No users match the current filters.'
                        : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((user) => (
                  <tr key={user.id} onClick={() => navigate(`/admin/users/${user.id}`)}>
                    <td>
                      <UserInfo user={user} size={32} />
                    </td>
                    <td style={{ color: '#666' }}>{user.email || '-'}</td>
                    <td>{renderRoleBadges(user.roles)}</td>
                    <td>{renderStatus(user)}</td>
                    <td style={{ color: '#999', fontSize: 12 }}>{formatDate(user.createdAt)}</td>
                    <td>
                      <button
                        className="action-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ id: user.id, name: getDisplayName(user) });
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Delete Confirmation Modal ──────────────────────────── */}
      {deleteConfirm && (
        <div className="user-detail-overlay" onClick={() => !deleteSubmitting && setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-header">
              <h3>Delete User</h3>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)} disabled={deleteSubmitting}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#666', fontSize: 14, lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
                This action may remove the user from the system.
              </p>
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleteSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="submit-btn"
                  style={{ background: '#dc3545', color: '#fff' }}
                  onClick={handleDeleteUser}
                  disabled={deleteSubmitting}
                >
                  {deleteSubmitting ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsersPage;
