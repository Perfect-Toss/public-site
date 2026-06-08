import '../../styles/page.css';
import './AdminUsersPage.css';

import {
  faCheckCircle,
  faEye,
  faFileImport,
  faFilter,
  faPlus,
  faSearch,
  faSort,
  faSortDown,
  faSortUp,
  faSpinner,
  faTimes,
  faTimesCircle,
  faTrash,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ROLES,
  createAthletes,
  createCoaches,
  createUser,
  deleteUserById,
  fetchAllUsers,
  type CreateUserDto,
  type User,
} from '../../api/api';
import { usePageData } from '../../hooks/usePageData';

/* ─── Helpers ─────────────────────────────────────────────────────── */

function getInitials(user: User): string {
  const first = user.firstName?.trim() ?? '';
  const last = user.lastName?.trim() ?? '';
  const f = first.charAt(0);
  const l = last.charAt(0);
  if (f && l) return `${f}${l}`.toUpperCase();
  if (f) return f.toUpperCase();
  return (user.email?.charAt(0) ?? '?').toUpperCase();
}

function getDisplayName(user: User): string {
  const first = user.firstName?.trim() ?? '';
  const last = user.lastName?.trim() ?? '';
  const full = [first, last].filter(Boolean).join(' ');
  return full || user.email || '-';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/* ─── Bulk CSV Parser ─────────────────────────────────────────────── */

function parseCsvUsers(raw: string): { firstName?: string; lastName?: string; email?: string }[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  // If first line looks like a header, try to detect columns
  const headerLine = lines[0].toLowerCase();
  const hasHeader =
    headerLine.includes('email') ||
    headerLine.includes('first') ||
    headerLine.includes('last') ||
    headerLine.includes('name');

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
    // Try to parse as: firstName, lastName, email  or  email, firstName, lastName
    if (parts.length >= 3) {
      // Heuristic: if first part contains @, order is email, first, last
      if (parts[0].includes('@')) {
        return { firstName: parts[1] || undefined, lastName: parts[2] || undefined, email: parts[0] || undefined };
      }
      return { firstName: parts[0] || undefined, lastName: parts[1] || undefined, email: parts[2] || undefined };
    }
    if (parts.length === 2) {
      if (parts[0].includes('@')) {
        return { email: parts[0] || undefined, lastName: parts[1] || undefined };
      }
      return { firstName: parts[0] || undefined, email: parts[1] || undefined };
    }
    return { email: parts[0] || undefined };
  });
}

/* ─── Component ───────────────────────────────────────────────────── */

type TabId = 'all-users' | 'add-user' | 'bulk-import';

function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<TabId>('all-users');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'name' | 'email' | 'status' | 'created'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [roleFilterOpen, setRoleFilterOpen] = useState(false);
  const navigate = useNavigate();
  const { data: users, loading, error, load } = usePageData<User[]>([]);

  /** All roles defined in the API schema */
  const allRoles = ROLES;

  // Add user form
  const [addForm, setAddForm] = useState({ firstName: '', lastName: '', email: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addResult, setAddResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Bulk import
  const [bulkType, setBulkType] = useState<'athletes' | 'coaches'>('athletes');
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    load(fetchAllUsers);
  }, [load]);

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
        const hasRole = roleFilter.some((r) => userRoles.includes(r as any));
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

  /* ─── Add User ─────────────────────────────────────────────── */

  const handleAddUser = useCallback(async () => {
    if (!addForm.email?.trim()) return;
    setAddSubmitting(true);
    setAddResult(null);
    try {
      const dto: CreateUserDto = {
        firstName: addForm.firstName.trim() || undefined,
        lastName: addForm.lastName.trim() || undefined,
        email: addForm.email.trim(),
      };
      await createUser(dto);
      setAddResult({ type: 'success', message: 'User created successfully!' });
      setAddForm({ firstName: '', lastName: '', email: '' });
      load(fetchAllUsers);
    } catch (err) {
      setAddResult({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create user.' });
    } finally {
      setAddSubmitting(false);
    }
  }, [addForm, load]);

  /* ─── Bulk Import ──────────────────────────────────────────── */

  const handleBulkImport = useCallback(async () => {
    if (!bulkCsv.trim()) return;
    setBulkSubmitting(true);
    setBulkResult(null);
    try {
      const parsed = parseCsvUsers(bulkCsv);
      if (parsed.length === 0) {
        setBulkResult({ type: 'error', message: 'No valid user data found in the input.' });
        setBulkSubmitting(false);
        return;
      }

      if (bulkType === 'athletes') {
        await createAthletes({ athletes: parsed });
      } else {
        await createCoaches({ coaches: parsed });
      }

      setBulkResult({
        type: 'success',
        message: `Successfully imported ${parsed.length} ${bulkType}.`,
      });
      setBulkCsv('');
      load(fetchAllUsers);
    } catch (err) {
      setBulkResult({ type: 'error', message: err instanceof Error ? err.message : 'Bulk import failed.' });
    } finally {
      setBulkSubmitting(false);
    }
  }, [bulkCsv, bulkType, load]);

  /* ─── Delete User ──────────────────────────────────────────── */

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeleteSubmitting(true);
    try {
      const result = await deleteUserById(deleteConfirm.id);
      if (result) {
        setDeleteConfirm(null);
        load(fetchAllUsers);
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteConfirm, load]);

  /* ─── Render Helpers ───────────────────────────────────────── */

  const renderRoleBadges = (roles?: string[] | null) => {
    if (!roles || roles.length === 0) return <span style={{ color: '#999', fontSize: 11 }}>—</span>;
    return roles.map((r) => (
      <span key={r} className={`role-badge ${r.toLowerCase()}`}>
        {r}
      </span>
    ));
  };

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
          <h2>USER MANAGEMENT</h2>
          <div className="header-actions">
            <button className="primary-btn icon-only-btn" onClick={() => setActiveTab('add-user')} title="Add User">
              <FontAwesomeIcon icon={faPlus} />
            </button>
            <button
              className="secondary-btn icon-only-btn"
              onClick={() => setActiveTab('bulk-import')}
              title="Bulk Import"
            >
              <FontAwesomeIcon icon={faFileImport} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-users-tabs">
          <button
            className={`admin-users-tab ${activeTab === 'all-users' ? 'active' : ''}`}
            onClick={() => setActiveTab('all-users')}
          >
            <FontAwesomeIcon icon={faUsers} style={{ marginRight: 6 }} />
            All Users
          </button>
          <button
            className={`admin-users-tab ${activeTab === 'add-user' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-user')}
          >
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />
            Add User
          </button>
          <button
            className={`admin-users-tab ${activeTab === 'bulk-import' ? 'active' : ''}`}
            onClick={() => setActiveTab('bulk-import')}
          >
            <FontAwesomeIcon icon={faFileImport} style={{ marginRight: 6 }} />
            Bulk Import
          </button>
        </div>

        {/* ── Tab: All Users ───────────────────────────────── */}
        {activeTab === 'all-users' && (
          <>
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
              <div className="users-table-wrapper">
                <table className="users-table">
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
                              {allRoles.length === 0 && (
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
                          <div className="user-name-cell">
                            <div className="user-avatar">{getInitials(user)}</div>
                            <div className="user-info">
                              <span className="name">{getDisplayName(user)}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#666' }}>{user.email || '-'}</td>
                        <td>{renderRoleBadges(user.roles)}</td>
                        <td>{renderStatus(user)}</td>
                        <td style={{ color: '#999', fontSize: 12 }}>{formatDate(user.createdAt)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/users/${user.id}`);
                              }}
                            >
                              <FontAwesomeIcon icon={faEye} style={{ marginRight: 4 }} />
                              View
                            </button>
                            <button
                              className="action-btn delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ id: user.id, name: getDisplayName(user) });
                              }}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Add User ────────────────────────────────── */}
        {activeTab === 'add-user' && (
          <div className="modal-body" style={{ maxWidth: 480 }}>
            {addResult && (
              <div className={`import-result ${addResult.type}`} style={{ marginBottom: 16 }}>
                {addResult.type === 'success' ? (
                  <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: 8 }} />
                ) : (
                  <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: 8 }} />
                )}
                {addResult.message}
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="add-first">First Name</label>
                <input
                  id="add-first"
                  type="text"
                  placeholder="Jane"
                  value={addForm.firstName}
                  onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="add-last">Last Name</label>
                <input
                  id="add-last"
                  type="text"
                  placeholder="Doe"
                  value={addForm.lastName}
                  onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="add-email">Email *</label>
              <input
                id="add-email"
                type="email"
                placeholder="jane@example.com"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 8 }}>
              <button className="cancel-btn" onClick={() => { setActiveTab('all-users'); setAddResult(null); }}>
                Cancel
              </button>
              <button className="submit-btn" disabled={!addForm.email.trim() || addSubmitting} onClick={handleAddUser}>
                {addSubmitting ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />}
                Create User
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Bulk Import ─────────────────────────────── */}
        {activeTab === 'bulk-import' && (
          <div className="bulk-import-section">
            <h4>Bulk Import Users</h4>
            <p>Paste a comma-separated list of users below. Supported formats:</p>

            <div className="import-type-toggle">
              <button
                className={`import-type-btn ${bulkType === 'athletes' ? 'active' : ''}`}
                onClick={() => setBulkType('athletes')}
              >
                Athletes
              </button>
              <button
                className={`import-type-btn ${bulkType === 'coaches' ? 'active' : ''}`}
                onClick={() => setBulkType('coaches')}
              >
                Coaches
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="bulk-csv">User Data (CSV)</label>
              <textarea
                id="bulk-csv"
                placeholder={
                  'firstName,lastName,email\nJane,Doe,jane@example.com\nJohn,Smith,john@example.com'
                }
                rows={6}
                value={bulkCsv}
                onChange={(e) => setBulkCsv(e.target.value)}
              />
              <span className="helper-text">
                Columns: <code>firstName, lastName, email</code> or <code>email, firstName, lastName</code>. 
                Header row is optional.
              </span>
            </div>

            {bulkResult && (
              <div className={`import-result ${bulkResult.type}`}>
                {bulkResult.type === 'success' ? (
                  <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: 8 }} />
                ) : (
                  <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: 8 }} />
                )}
                {bulkResult.message}
              </div>
            )}

            <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 12, marginTop: 0 }}>
              <button className="cancel-btn" onClick={() => { setActiveTab('all-users'); setBulkResult(null); }}>
                Cancel
              </button>
              <button
                className="submit-btn"
                disabled={!bulkCsv.trim() || bulkSubmitting}
                onClick={handleBulkImport}
              >
                {bulkSubmitting ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faFileImport} style={{ marginRight: 6 }} />
                )}
                Import {bulkType === 'athletes' ? 'Athletes' : 'Coaches'}
              </button>
            </div>
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
