import '../../styles/page.css';
import './AdminTabletsPage.css';

import {
  faCog,
  faSearch,
  faSort,
  faSortDown,
  faSortUp,
  faSpinner,
  faTablet,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  createTablet,
  deleteTablet,
  fetchAllTablets,
  fetchServiceAccounts,
  updateTablet,
  type CreateTabletRequest,
  type Tablet,
  type UpdateTabletRequest,
  type User,
} from '../../api/api';
import { usePageData } from '../../hooks/usePageData';
import { formatDate } from '../../utils/format';

/* ─── Helpers ─────────────────────────────────────────────────────── */

type SortColumn = 'name' | 'tabletUserId' | 'model' | 'pin' | 'cover' | 'holder' | 'tripod' | 'serviceAccount' | 'createdAt';
type SortDir = 'asc' | 'desc';

/* ─── Component ───────────────────────────────────────────────────── */

export interface AdminTabletsPageHandle {
  openAddForm: () => void;
}

const AdminTabletsPage = forwardRef<AdminTabletsPageHandle>(function AdminTabletsPage(_props: unknown, ref) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDir>('asc');

  const { data: tablets, loading, error, load } = usePageData<Tablet[]>([]);

  // ── Form state ──────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingTablet, setEditingTablet] = useState<Tablet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tabletUserId: '',
    pin: '',
    serviceAccountId: '',
    cover: false,
    holder: false,
    tripod: false,
    tabletTypeId: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formResult, setFormResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Delete confirm state ────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Tablet | null>(null);

  // ── Service accounts list for assignment dropdown ───────────────
  const [serviceAccounts, setServiceAccounts] = useState<User[]>([]);
  const [serviceAccountsLoading, setServiceAccountsLoading] = useState(false);

  useEffect(() => {
    load(fetchAllTablets);
  }, [load]);

  useEffect(() => {
    setServiceAccountsLoading(true);
    fetchServiceAccounts()
      .then(setServiceAccounts)
      .catch(() => setServiceAccounts([]))
      .finally(() => setServiceAccountsLoading(false));
  }, []);

  /* ─── Sorting & Filtering ─────────────────────────────────────── */

  const sortedTablets = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = tablets.filter((t) => {
      return (
        (t.name ?? '').toLowerCase().includes(q) ||
        (t.tabletUserId ?? '').toLowerCase().includes(q) ||
        (t.serviceAccount?.email ?? '').toLowerCase().includes(q) ||
        (t.serviceAccount?.firstName ?? '').toLowerCase().includes(q) ||
        (t.serviceAccount?.lastName ?? '').toLowerCase().includes(q) ||
        (t.tabletType?.model ?? '').toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '');
          break;
        case 'tabletUserId':
          cmp = (a.tabletUserId ?? '').localeCompare(b.tabletUserId ?? '');
          break;
        case 'model':
          cmp = (a.tabletType?.model ?? '').localeCompare(b.tabletType?.model ?? '');
          break;
        case 'pin':
          cmp = (a.pin ?? 0) - (b.pin ?? 0);
          break;
        case 'cover':
          cmp = (a.cover === b.cover) ? 0 : a.cover ? -1 : 1;
          break;
        case 'holder':
          cmp = (a.holder === b.holder) ? 0 : a.holder ? -1 : 1;
          break;
        case 'tripod':
          cmp = (a.tripod === b.tripod) ? 0 : a.tripod ? -1 : 1;
          break;
        case 'createdAt':
          cmp = (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
          break;
        case 'serviceAccount':
          cmp = (a.serviceAccount?.email ?? '').localeCompare(b.serviceAccount?.email ?? '');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [tablets, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    setSortDirection((prev) => (sortColumn === column && prev === 'asc' ? 'desc' : 'asc'));
    setSortColumn(column);
  };

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <FontAwesomeIcon icon={faSort} style={{ marginLeft: 4, opacity: 0.3 }} />;
    return sortDirection === 'asc'
      ? <FontAwesomeIcon icon={faSortUp} style={{ marginLeft: 4 }} />
      : <FontAwesomeIcon icon={faSortDown} style={{ marginLeft: 4 }} />;
  };

  /* ─── Open Add / Edit Form ────────────────────────────────────── */

  const openAddForm = () => {
    setEditingTablet(null);
    setFormData({ name: '', tabletUserId: '', pin: '', serviceAccountId: '', cover: false, holder: false, tripod: false, tabletTypeId: '' });
    setFormResult(null);
    setShowForm(true);
  };

  const openEditForm = (tablet: Tablet) => {
    setEditingTablet(tablet);
    setFormData({
      name: tablet.name ?? '',
      tabletUserId: tablet.tabletUserId ?? '',
      pin: tablet.pin != null ? String(tablet.pin) : '',
      serviceAccountId: tablet.serviceAccountId ?? '',
      cover: tablet.cover ?? false,
      holder: tablet.holder ?? false,
      tripod: tablet.tripod ?? false,
      tabletTypeId: tablet.tabletTypeId ?? '',
    });
    setFormResult(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTablet(null);
    setFormResult(null);
  };

  /* ─── Submit Form ─────────────────────────────────────────────── */

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) return;

    setFormSubmitting(true);
    setFormResult(null);

    try {
      const pinValue = formData.pin ? parseInt(formData.pin, 10) : undefined;

      if (editingTablet) {
        const dto: UpdateTabletRequest = {
          name: formData.name.trim() || undefined,
          tabletUserId: formData.tabletUserId.trim() || undefined,
          pin: !isNaN(pinValue!) ? pinValue : undefined,
          serviceAccountId: formData.serviceAccountId || null,
          cover: formData.cover || undefined,
          holder: formData.holder || undefined,
          tripod: formData.tripod || undefined,
          tabletTypeId: formData.tabletTypeId.trim() || undefined,
        };
        await updateTablet(editingTablet.id, dto);
        setFormResult({ type: 'success', message: 'Tablet updated successfully!' });
      } else {
        const dto: CreateTabletRequest = {
          name: formData.name.trim() || undefined,
          tabletUserId: formData.tabletUserId.trim() || undefined,
          pin: !isNaN(pinValue!) ? pinValue : undefined,
          serviceAccountId: formData.serviceAccountId || null,
          cover: formData.cover || undefined,
          holder: formData.holder || undefined,
          tripod: formData.tripod || undefined,
          tabletTypeId: formData.tabletTypeId.trim() || undefined,
        };
        await createTablet(dto);
        setFormResult({ type: 'success', message: 'Tablet created successfully!' });
        setFormData({ name: '', tabletUserId: '', pin: '', serviceAccountId: '', cover: false, holder: false, tripod: false, tabletTypeId: '' });
      }

      load(fetchAllTablets);

      setTimeout(() => {
        closeForm();
      }, 1200);
    } catch (err) {
      setFormResult({ type: 'error', message: err instanceof Error ? err.message : 'An error occurred.' });
    } finally {
      setFormSubmitting(false);
    }
  }, [formData, editingTablet, load]);

  /* ─── Delete ──────────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    try {
      await deleteTablet(deleteTarget.id);
      setDeleteTarget(null);
      load(fetchAllTablets);
    } catch (err) {
      console.error('Failed to delete tablet:', err);
      setDeleteTarget(null);
    }
  }, [deleteTarget, load]);

  /* ─── Render Boolean Badge ────────────────────────────────────── */

  useImperativeHandle(ref, () => ({ openAddForm }), []);

  const renderBool = (value: boolean | null | undefined) => (
    <span className={`bool-badge ${value ? 'yes' : 'no'}`}>
      {value ? 'Yes' : 'No'}
    </span>
  );

  /* ─── Render ──────────────────────────────────────────────────── */

  return (
    <div className="admin-tablets-page">
      <section className="section">
        <div className="table-toolbar">
              <div className="search-box">
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search tablets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <span className="table-result-count">
                {sortedTablets.length} tablet{sortedTablets.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="tablets-table-wrapper">
              <table className="tablets-table">
                <thead>
                  <tr>
                    <th className="sortable-header" onClick={() => handleSort('name')}>
                      Name {renderSortIcon('name')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('model')}>
                      Model {renderSortIcon('model')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('tabletUserId')}>
                      Tablet User ID {renderSortIcon('tabletUserId')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('pin')}>
                      PIN {renderSortIcon('pin')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('cover')}>
                      Cover {renderSortIcon('cover')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('holder')}>
                      Holder {renderSortIcon('holder')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('tripod')}>
                      Tripod {renderSortIcon('tripod')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('serviceAccount')}>
                      Service Account {renderSortIcon('serviceAccount')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('createdAt')}>
                      Created {renderSortIcon('createdAt')}
                    </th>
                    <th style={{ width: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr className="loading-row">
                      <td colSpan={10}>
                        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                        Loading tablets...
                      </td>
                    </tr>
                  )}
                  {error && (
                    <tr className="error-row">
                      <td colSpan={10}>Failed to load tablets. Please try again.</td>
                    </tr>
                  )}
                  {!loading && !error && sortedTablets.length === 0 && (
                    <tr className="loading-row">
                      <td colSpan={10}>
                        <div className="empty-state">
                          <FontAwesomeIcon icon={faTablet} size="3x" />
                          <p>No tablets found. Add your first tablet to get started.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading && !error && sortedTablets.map((tablet) => (
                    <tr key={tablet.id}>
                      <td><strong>{tablet.name || '—'}</strong></td>
                      <td>{tablet.tabletType?.model || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                        {tablet.tabletUserId || '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                        {tablet.pin != null ? String(tablet.pin).padStart(4, '0') : '—'}
                      </td>
                      <td>{renderBool(tablet.cover)}</td>
                      <td>{renderBool(tablet.holder)}</td>
                      <td>{renderBool(tablet.tripod)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                        {tablet.serviceAccount ? (
                          <span title={tablet.serviceAccount.email ?? ''}>
                            {tablet.serviceAccount.firstName || tablet.serviceAccount.lastName
                              ? `${tablet.serviceAccount.firstName ?? ''} ${tablet.serviceAccount.lastName ?? ''}`.trim()
                              : tablet.serviceAccount.email || '—'}
                          </span>
                        ) : (
                          <span style={{ color: '#bbb' }}>None</span>
                        )}
                      </td>
                      <td style={{ color: '#999', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {tablet.createdAt ? formatDate(tablet.createdAt) : '—'}
                      </td>
                      <td>
                        <button className="action-btn edit" onClick={() => openEditForm(tablet)} title="Edit tablet">
                          <FontAwesomeIcon icon={faCog} />
                        </button>
                        <button className="action-btn delete" onClick={() => setDeleteTarget(tablet)} title="Delete tablet">
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
      </section>

      {/* ─── Add / Edit Form Overlay ──────────────────────────────── */}
      {showForm && (
        <div className="form-overlay" onClick={closeForm}>
          <div className="form-panel" onClick={(e) => e.stopPropagation()}>
            <h3>{editingTablet ? 'Edit Tablet' : 'Add New Tablet'}</h3>

            {formResult && (
              <div className={`form-result ${formResult.type}`}>
                {formResult.message}
              </div>
            )}

            <div className="form-group">
              <label>Tablet Name *</label>
              <input
                type="text"
                placeholder="e.g. Field Tablet 1"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Tablet User ID</label>
              <input
                type="text"
                placeholder="e.g. tab-user-001"
                value={formData.tabletUserId}
                onChange={(e) => setFormData((prev) => ({ ...prev, tabletUserId: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>PIN</label>
              <input
                type="number"
                placeholder="e.g. 1234"
                value={formData.pin}
                onChange={(e) => setFormData((prev) => ({ ...prev, pin: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Service Account</label>
              <select
                value={formData.serviceAccountId}
                onChange={(e) => setFormData((prev) => ({ ...prev, serviceAccountId: e.target.value }))}
              >
                <option value="">— None —</option>
                {serviceAccountsLoading && (
                  <option value="" disabled>Loading...</option>
                )}
                {!serviceAccountsLoading && serviceAccounts.map((sa) => (
                  <option key={sa.id} value={sa.id}>
                    {sa.firstName && sa.lastName
                      ? `${sa.firstName} ${sa.lastName}`
                      : sa.email || sa.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.cover}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cover: e.target.checked }))}
                />
                Has Cover
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.holder}
                  onChange={(e) => setFormData((prev) => ({ ...prev, holder: e.target.checked }))}
                />
                Has Holder
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.tripod}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tripod: e.target.checked }))}
                />
                Has Tripod
              </label>
            </div>

            <div className="form-actions">
              <button className="cancel-btn" onClick={closeForm}>Cancel</button>
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={formSubmitting || !formData.name.trim()}
              >
                {formSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                    Saving...
                  </>
                ) : (
                  editingTablet ? 'Update Tablet' : 'Create Tablet'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation ──────────────────────────────────── */}
      {deleteTarget && (
        <div className="form-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="form-panel confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Tablet</h3>
            <p>
              Are you sure you want to delete{' '}
              <span className="machine-name">{deleteTarget.name}</span>?
              This action cannot be undone.
            </p>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="submit-btn" onClick={handleDelete} style={{ background: '#c62828', color: '#fff' }}>
                <FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default AdminTabletsPage;
