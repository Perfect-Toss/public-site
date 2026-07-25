import '../../styles/page.css';
import './AdminTabletTypesPage.css';

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
  deleteTabletType,
  fetchAllTabletTypes,
  type TabletType,
} from '../../api/api.tabletTypes';
import { usePageData } from '../../hooks/usePageData';
import { formatDate } from '../../utils/format';

/* ─── Helpers ─────────────────────────────────────────────────────── */

type SortColumn = 'model' | 'size' | 'memory' | 'camera' | 'price' | 'createdAt';
type SortDir = 'asc' | 'desc';

/* ─── Component ───────────────────────────────────────────────────── */

function AdminTabletTypesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('model');
  const [sortDirection, setSortDirection] = useState<SortDir>('asc');

  const { data: tabletTypes, loading, error, load } = usePageData<TabletType[]>([]);

  // ── Delete confirm state ────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<TabletType | null>(null);

  useEffect(() => {
    load(fetchAllTabletTypes);
  }, [load]);

  /* ─── Sorting & Filtering ─────────────────────────────────────── */

  const sortedTypes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = tabletTypes.filter((t) => {
      return (
        (t.model ?? '').toLowerCase().includes(q) ||
        (t.size ?? '').toLowerCase().includes(q) ||
        (t.memory ?? '').toLowerCase().includes(q) ||
        (t.camera ?? '').toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'model':
          cmp = (a.model ?? '').localeCompare(b.model ?? '');
          break;
        case 'size':
          cmp = (a.size ?? '').localeCompare(b.size ?? '');
          break;
        case 'memory':
          cmp = (a.memory ?? '').localeCompare(b.memory ?? '');
          break;
        case 'camera':
          cmp = (a.camera ?? '').localeCompare(b.camera ?? '');
          break;
        case 'price':
          cmp = (a.price ?? 0) - (b.price ?? 0);
          break;
        case 'createdAt':
          cmp = (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [tabletTypes, searchQuery, sortColumn, sortDirection]);

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

  const openEditForm = (type: TabletType) => {
    navigate(`/admin/devices/tablet-types/${type.id}/edit`);
  };

  /* ─── Delete ──────────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    try {
      await deleteTabletType(deleteTarget.id);
      setDeleteTarget(null);
      load(fetchAllTabletTypes);
    } catch (err) {
      console.error('Failed to delete tablet type:', err);
      setDeleteTarget(null);
    }
  }, [deleteTarget, load]);

  /* ─── Render ──────────────────────────────────────────────────── */

  return (
    <div className="admin-tablet-types-page">
      {/* ─── Toolbar ───────────────────────────────────────── */}
      <div className="table-toolbar">
        <div className="search-box">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search tablet types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="table-result-count">
          {sortedTypes.length} type{sortedTypes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ─── Table ─────────────────────────────────────────── */}
      <div className="table-wrapper tablet-types-table-wrapper">
        <table className="data-table tablet-types-table">
          <thead>
            <tr>
              <th className="sortable-header" onClick={() => handleSort('model')}>
                Model {renderSortIcon('model')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('size')}>
                Size {renderSortIcon('size')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('memory')}>
                Memory {renderSortIcon('memory')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('camera')}>
                Camera {renderSortIcon('camera')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('price')}>
                Price {renderSortIcon('price')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('createdAt')}>
                Created {renderSortIcon('createdAt')}
              </th>
              <th style={{ width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr className="loading-row">
                <td colSpan={7}>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                  Loading tablet types...
                </td>
              </tr>
            )}
            {error && (
              <tr className="error-row">
                <td colSpan={7}>Failed to load tablet types. Please try again.</td>
              </tr>
            )}
            {!loading && !error && sortedTypes.length === 0 && (
              <tr className="loading-row">
                <td colSpan={7}>
                  <div className="empty-state">
                    <FontAwesomeIcon icon={faTablet} size="3x" />
                    <p>No tablet types found. Add your first tablet type to get started.</p>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && sortedTypes.map((type) => (
              <tr key={type.id}>
                <td>
                  <a
                    href="#"
                    className="table-link"
                    onClick={(e) => { e.preventDefault(); openEditForm(type); }}
                  >
                    {type.model || '—'}
                  </a>
                </td>
                <td>{type.size || '—'}</td>
                <td>{type.memory || '—'}</td>
                <td>{type.camera || '—'}</td>
                <td>{type.price != null ? `$${type.price.toFixed(2)}` : '—'}</td>
                <td style={{ color: '#999', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {type.createdAt ? formatDate(type.createdAt) : '—'}
                </td>
                <td>
                  <button className="action-btn delete" onClick={() => setDeleteTarget(type)} title="Delete tablet type">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Delete Confirmation ──────────────────────────────────── */}
      {deleteTarget && (
        <div className="form-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="form-panel confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Tablet Type</h3>
            <p>
              Are you sure you want to delete{' '}
              <span className="machine-name">{deleteTarget.model}</span>?
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

export default AdminTabletTypesPage;
