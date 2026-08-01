import '../../styles/page.css';
import './AdminTagsPage.css';

import {
  faSearch,
  faSort,
  faSortDown,
  faSortUp,
  faSpinner,
  faTags,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Tag } from '../../api/api.tags';
import { formatDate } from '../../utils/format';
import { useNavigate } from 'react-router-dom';
import { useTagStore } from '../../stores/tagStore';

/* ─── Helpers ─────────────────────────────────────────────────────── */

type SortColumn = 'name' | 'isGlobal' | 'createdAt';
type SortDir = 'asc' | 'desc';

/* ─── Component ───────────────────────────────────────────────────── */

function AdminTagsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDir>('asc');

  const { tags, loading, error, loadTags, deleteTag } = useTagStore();

  // ── Delete confirm state ────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  /* ─── Sorting & Filtering ─────────────────────────────────────── */

  const sortedTags = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = tags.filter((t) => {
      return (
        (t.name ?? '').toLowerCase().includes(q) ||
        (t.colorHex ?? '').toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '');
          break;
        case 'isGlobal':
          cmp = Number(Boolean(b.isGlobal)) - Number(Boolean(a.isGlobal));
          break;
        case 'createdAt':
          cmp = (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [tags, searchQuery, sortColumn, sortDirection]);

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

  const openEditForm = (tag: Tag) => {
    navigate(`/admin/devices/tags/${tag.id}/edit`);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    try {
      await deleteTag(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete tag:', err);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteTag]);

  /* ─── Render ──────────────────────────────────────────────────── */

  return (
    <div className="admin-tags-page">
      {/* ─── Toolbar ───────────────────────────────────────── */}
      <div className="table-toolbar">
        <div className="search-box">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="table-result-count">
          {sortedTags.length} tag{sortedTags.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ─── Table ─────────────────────────────────────────── */}
      <div className="table-wrapper tags-table-wrapper">
        <table className="data-table tags-table">
          <thead>
            <tr>
              <th className="sortable-header" onClick={() => handleSort('name')}>
                Tag {renderSortIcon('name')}
              </th>
              <th>Color</th>
              <th className="sortable-header" onClick={() => handleSort('isGlobal')}>
                Scope {renderSortIcon('isGlobal')}
              </th>
              <th className="sortable-header" onClick={() => handleSort('createdAt')}>
                Created {renderSortIcon('createdAt')}
              </th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr className="loading-row">
                <td colSpan={5}>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                  Loading tags...
                </td>
              </tr>
            )}
            {error && (
              <tr className="error-row">
                <td colSpan={5}>Failed to load tags. Please try again.</td>
              </tr>
            )}
            {!loading && !error && sortedTags.length === 0 && (
              <tr className="loading-row">
                <td colSpan={5}>
                  <div className="empty-state">
                    <FontAwesomeIcon icon={faTags} size="3x" />
                    <p>No tags found. Add your first tag to get started.</p>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && sortedTags.map((tag) => (
              <tr key={tag.id}>
                <td>
                  <a
                    href="#"
                    className="table-link"
                    onClick={(e) => { e.preventDefault(); openEditForm(tag); }}
                  >
                    <span className="tag-name-cell">
                      {tag.colorHex ? (
                        <span
                          className="tag-swatch"
                          style={{ background: tag.colorHex }}
                          title={tag.colorHex}
                        />
                      ) : (
                        <span
                          className="tag-swatch"
                          style={{ background: '#ccc' }}
                          title="No color"
                        />
                      )}
                      {tag.name || '—'}
                    </span>
                  </a>
                </td>
                <td>
                  {tag.colorHex ? (
                    <span className="tag-color-value">{tag.colorHex}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {tag.isGlobal ? (
                    <span className="tag-global-badge">Global</span>
                  ) : (
                    <span className="tag-user-badge">User</span>
                  )}
                </td>
                <td style={{ color: '#999', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {tag.createdAt ? formatDate(tag.createdAt) : '—'}
                </td>
                <td>
                  <button className="action-btn edit" onClick={() => openEditForm(tag)} title="Edit tag">
                    Edit
                  </button>
                  <button className="action-btn delete" onClick={() => setDeleteTarget(tag)} title="Delete tag">
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
            <h3>Delete Tag</h3>
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

export default AdminTagsPage;
