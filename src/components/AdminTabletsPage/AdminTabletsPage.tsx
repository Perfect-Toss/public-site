import '../../styles/page.css';
import './AdminTabletsPage.css';

import {
  faSearch,
  faSort,
  faSortDown,
  faSortUp,
  faSpinner,
  faTablet,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteTablet,
  fetchAllTablets,
  type Tablet,
} from '../../api/api';
import { usePageData } from '../../hooks/usePageData';
import { formatDate } from '../../utils/format';

/* ─── Helpers ─────────────────────────────────────────────────────── */

type SortColumn = 'name' | 'tabletUserId' | 'model' | 'pin' | 'cover' | 'holder' | 'tripod' | 'serviceAccount' | 'createdAt';
type SortDir = 'asc' | 'desc';

/* ─── Component ───────────────────────────────────────────────────── */

function AdminTabletsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDir>('asc');

  const { data: tablets, loading, error, load } = usePageData<Tablet[]>([]);

  // ── Delete confirm state ────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Tablet | null>(null);

  useEffect(() => {
    load(fetchAllTablets);
  }, [load]);

  /* ─── Sorting & Filtering ─────────────────────────────────────── */

  const sortedTablets = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = tablets.filter((t) => {
      return (
        (t.name ?? '').toLowerCase().includes(q) ||
        (t.tabletUserId ?? '').toLowerCase().includes(q) ||
        (t.pin ?? '').toLowerCase().includes(q)
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
        case 'pin':
          cmp = (a.pin ?? '').localeCompare(b.pin ?? '');
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

  /* ─── Edit / Delete ──────────────────────────────────────────── */

  const openEditForm = (tablet: Tablet) => {
    navigate(`/admin/devices/tablets/${tablet.id}/edit`);
  };

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

            <div className="table-wrapper tablets-table-wrapper">
              <table className="data-table tablets-table">
                <thead>
                  <tr>
                    <th className="sortable-header" onClick={() => handleSort('name')}>
                      Name {renderSortIcon('name')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('tabletUserId')}>
                      Tablet User ID {renderSortIcon('tabletUserId')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('serviceAccount')}>
                      Service Account {renderSortIcon('serviceAccount')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('model')}>
                      Model {renderSortIcon('model')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('pin')}>
                      PIN {renderSortIcon('pin')}
                    </th>
                    <th>Accessories</th>
                    <th className="sortable-header" onClick={() => handleSort('createdAt')}>
                      Created {renderSortIcon('createdAt')}
                    </th>
                    <th style={{ width: 80 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr className="loading-row">
                      <td colSpan={8}>
                        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                        Loading tablets...
                      </td>
                    </tr>
                  )}
                  {error && (
                    <tr className="error-row">
                      <td colSpan={8}>Failed to load tablets. Please try again.</td>
                    </tr>
                  )}
                  {!loading && !error && sortedTablets.length === 0 && (
                    <tr className="loading-row">
                      <td colSpan={8}>
                        <div className="empty-state">
                          <FontAwesomeIcon icon={faTablet} size="3x" />
                          <p>No tablets found. Add your first tablet to get started.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading && !error && sortedTablets.map((tablet) => (
                    <tr key={tablet.id} className="tablet-row">
                      <td>
                        <a
                          href="#"
                          className="table-link"
                          onClick={(e) => { e.preventDefault(); openEditForm(tablet); }}
                        >
                          {tablet.name || '—'}
                        </a>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                        {tablet.tabletUserId || '—'}
                      </td>
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
                      <td>{tablet.tabletType?.model || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                        {tablet.pin != null ? tablet.pin.padStart(4, '0') : '—'}
                      </td>
                      <td>
                        <div className="acc-stack">
                          <span className={`acc-item ${tablet.cover ? 'on' : 'off'}`}>
                            <span className="acc-icon">{tablet.cover ? '✓' : '—'}</span>
                            Cover
                          </span>
                          <span className={`acc-item ${tablet.holder ? 'on' : 'off'}`}>
                            <span className="acc-icon">{tablet.holder ? '✓' : '—'}</span>
                            Holder
                          </span>
                          <span className={`acc-item ${tablet.tripod ? 'on' : 'off'}`}>
                            <span className="acc-icon">{tablet.tripod ? '✓' : '—'}</span>
                            Tripod
                          </span>
                        </div>
                      </td>
                      <td style={{ color: '#999', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {tablet.createdAt ? formatDate(tablet.createdAt) : '—'}
                      </td>
                      <td>
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
}

export default AdminTabletsPage;
