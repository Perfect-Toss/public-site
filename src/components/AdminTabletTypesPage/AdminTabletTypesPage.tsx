import '../../styles/page.css';
import './AdminTabletTypesPage.css';

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
  createTabletType,
  deleteTabletType,
  fetchAllTabletTypes,
  updateTabletType,
  type CreateTabletTypeRequest,
  type TabletType,
  type UpdateTabletTypeRequest,
} from '../../api/api';
import { usePageData } from '../../hooks/usePageData';
import { formatDate } from '../../utils/format';

/* ─── Helpers ─────────────────────────────────────────────────────── */

type SortColumn = 'model' | 'size' | 'memory' | 'camera' | 'price' | 'createdAt';
type SortDir = 'asc' | 'desc';

export interface AdminTabletTypesPageHandle {
  openAddForm: () => void;
}

/* ─── Component ───────────────────────────────────────────────────── */

const AdminTabletTypesPage = forwardRef<AdminTabletTypesPageHandle>(function AdminTabletTypesPage(_props: unknown, ref) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('model');
  const [sortDirection, setSortDirection] = useState<SortDir>('asc');

  const { data: tabletTypes, loading, error, load } = usePageData<TabletType[]>([]);

  // ── Form state ──────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<TabletType | null>(null);
  const [formData, setFormData] = useState({
    model: '',
    size: '',
    memory: '',
    camera: '',
    price: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formResult, setFormResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  /* ─── Open Add / Edit Form ────────────────────────────────────── */

  const openAddForm = () => {
    setEditingType(null);
    setFormData({ model: '', size: '', memory: '', camera: '', price: '' });
    setFormResult(null);
    setShowForm(true);
  };

  const openEditForm = (type: TabletType) => {
    setEditingType(type);
    setFormData({
      model: type.model ?? '',
      size: type.size ?? '',
      memory: type.memory ?? '',
      camera: type.camera ?? '',
      price: type.price != null ? String(type.price) : '',
    });
    setFormResult(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingType(null);
    setFormResult(null);
  };

  /* ─── Submit Form ─────────────────────────────────────────────── */

  const handleSubmit = useCallback(async () => {
    if (!formData.model.trim()) return;

    setFormSubmitting(true);
    setFormResult(null);

    try {
      const priceValue = formData.price ? parseFloat(formData.price) : undefined;

      if (editingType) {
        const dto: UpdateTabletTypeRequest = {
          model: formData.model.trim() || undefined,
          size: formData.size.trim() || undefined,
          memory: formData.memory.trim() || undefined,
          camera: formData.camera.trim() || undefined,
          price: !isNaN(priceValue!) ? priceValue : undefined,
        };
        await updateTabletType(editingType.id, dto);
        setFormResult({ type: 'success', message: 'Tablet type updated successfully!' });
      } else {
        const dto: CreateTabletTypeRequest = {
          model: formData.model.trim() || undefined,
          size: formData.size.trim() || undefined,
          memory: formData.memory.trim() || undefined,
          camera: formData.camera.trim() || undefined,
          price: !isNaN(priceValue!) ? priceValue : undefined,
        };
        await createTabletType(dto);
        setFormResult({ type: 'success', message: 'Tablet type created successfully!' });
        setFormData({ model: '', size: '', memory: '', camera: '', price: '' });
      }

      load(fetchAllTabletTypes);

      setTimeout(() => {
        closeForm();
      }, 1200);
    } catch (err) {
      setFormResult({ type: 'error', message: err instanceof Error ? err.message : 'An error occurred.' });
    } finally {
      setFormSubmitting(false);
    }
  }, [formData, editingType, load]);

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

  useImperativeHandle(ref, () => ({ openAddForm }), []);

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
      <div className="tablet-types-table-wrapper">
        <table className="tablet-types-table">
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
              <th style={{ width: 140 }}>Actions</th>
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
                <td><strong>{type.model || '—'}</strong></td>
                <td>{type.size || '—'}</td>
                <td>{type.memory || '—'}</td>
                <td>{type.camera || '—'}</td>
                <td>{type.price != null ? `$${type.price.toFixed(2)}` : '—'}</td>
                <td style={{ color: '#999', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {type.createdAt ? formatDate(type.createdAt) : '—'}
                </td>
                <td>
                  <button className="action-btn edit" onClick={() => openEditForm(type)} title="Edit tablet type">
                    <FontAwesomeIcon icon={faCog} />
                  </button>
                  <button className="action-btn delete" onClick={() => setDeleteTarget(type)} title="Delete tablet type">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Add / Edit Form Overlay ──────────────────────────────── */}
      {showForm && (
        <div className="form-overlay" onClick={closeForm}>
          <div className="form-panel" onClick={(e) => e.stopPropagation()}>
            <h3>{editingType ? 'Edit Tablet Type' : 'Add New Tablet Type'}</h3>

            {formResult && (
              <div className={`form-result ${formResult.type}`}>
                {formResult.message}
              </div>
            )}

            <div className="form-group">
              <label>Model *</label>
              <input
                type="text"
                placeholder="e.g. iPad Pro 12.9"
                value={formData.model}
                onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Size</label>
              <input
                type="text"
                placeholder="e.g. 12.9 inches"
                value={formData.size}
                onChange={(e) => setFormData((prev) => ({ ...prev, size: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Memory</label>
              <input
                type="text"
                placeholder="e.g. 256GB"
                value={formData.memory}
                onChange={(e) => setFormData((prev) => ({ ...prev, memory: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Camera</label>
              <input
                type="text"
                placeholder="e.g. 12MP Wide"
                value={formData.camera}
                onChange={(e) => setFormData((prev) => ({ ...prev, camera: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 799.99"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
              />
            </div>

            <div className="form-actions">
              <button className="cancel-btn" onClick={closeForm}>Cancel</button>
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={formSubmitting || !formData.model.trim()}
              >
                {formSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                    Saving...
                  </>
                ) : (
                  editingType ? 'Update Tablet Type' : 'Create Tablet Type'
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
});

export default AdminTabletTypesPage;
