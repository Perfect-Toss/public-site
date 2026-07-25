import '../../styles/page.css';
import './AdminOrganizationsPage.css';

import {
  faBuilding,
  faChevronDown,
  faChevronRight,
  faEdit,
  faPlus,
  faSearch,
  faSpinner,
  faTimes,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  type Entity,
  deleteEntity,
  fetchAllEntities,
} from '../../api/api.entities';
import { usePageData } from '../../hooks/usePageData';
import { formatDate } from '../../utils/format';

/* ─── Component ───────────────────────────────────────────────────── */

function AdminOrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { data: organizations, loading, error, load } = usePageData<Entity[]>([]);

  useEffect(() => {
    load(fetchAllEntities);
  }, [load]);

  // ── Delete confirmation ────────────────────────────────────────

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  /* ─── Build hierarchy ─────────────────────────────────────── */

  /** Map of parentEntityId → child orgs, built from the flat list. */
  const orgTree = useMemo(() => {
    const childrenMap = new Map<string, Entity[]>();
    const rootOrgs: Entity[] = [];

    for (const org of organizations) {
      if (org.parentEntityId) {
        const existing = childrenMap.get(org.parentEntityId) ?? [];
        existing.push(org);
        childrenMap.set(org.parentEntityId, existing);
      } else {
        rootOrgs.push(org);
      }
    }

    // Sort children by name for consistent ordering
    for (const [, children] of childrenMap) {
      children.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    }
    rootOrgs.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    return { childrenMap, rootOrgs };
  }, [organizations]);

  /** Flatten the tree into a depth-annotated row list, respecting expansion state. */
  interface FlatRow {
    org: Entity;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
  }

  const treeRows = useMemo((): FlatRow[] => {
    const rows: FlatRow[] = [];

    function walk(orgs: Entity[], depth: number) {
      for (const org of orgs) {
        const children = orgTree.childrenMap.get(org.id) ?? [];
        const hasChildren = children.length > 0;
        const isExpanded = expandedOrgs.has(org.id);
        rows.push({ org, depth, hasChildren, isExpanded });

        if (hasChildren && isExpanded) {
          walk(children, depth + 1);
        }
      }
    }

    walk(orgTree.rootOrgs, 0);
    return rows;
  }, [orgTree, expandedOrgs]);

  /** When searching, show a flat filtered list instead of the tree. */
  const visibleRows = useMemo((): FlatRow[] => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return treeRows;

    // Find all matching orgs (flat, no hierarchy)
    const matched = organizations.filter((org) =>
      (org.name ?? '').toLowerCase().includes(q) ||
      (org.entityType ?? '').toLowerCase().includes(q) ||
      (org.description ?? '').toLowerCase().includes(q),
    );

    return matched.map((org) => ({
      org,
      depth: 0,
      hasChildren: (orgTree.childrenMap.get(org.id) ?? []).length > 0,
      isExpanded: false,
    }));
  }, [organizations, orgTree, treeRows, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /** Lookup an org name by ID (for the parent column). */
  const orgNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const org of organizations) {
      map.set(org.id, org.name ?? 'Unknown');
    }
    return map;
  }, [organizations]);

  /* ─── Edit Organization ────────────────────────────────────── */

  const openEdit = (org: Entity) => {
    navigate(`/admin/organizations/${org.id}/edit`);
  };

  /* ─── Delete Organization ──────────────────────────────────── */

  const handleDeleteOrganization = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeleteSubmitting(true);
    try {
      await deleteEntity(deleteConfirm.id);
      setDeleteConfirm(null);
      load(fetchAllEntities);
    } catch (err) {
      console.error('Failed to delete organization:', err);
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteConfirm, load]);

  /* ─── Render ───────────────────────────────────────────────── */

  return (
    <div className="admin-orgs-page">
      <section className="section">
        <div className="section-header">
          <h2>ORGANIZATION MANAGEMENT</h2>
        </div>

        <button
          className="fab"
          onClick={() => navigate('/admin/organizations/new')}
          title="Add Organization"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>

        {/* ── Organizations List ──────────────────────────────── */}
            <div className="table-toolbar">
              <div className="search-box">
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name, type, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              {!loading && !error && (
                <span className="table-result-count">
                  {visibleRows.length} of {organizations.length} organization
                  {visibleRows.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {loading && (
              <div className="empty-state-large">
                <FontAwesomeIcon icon={faSpinner} size="3x" spin style={{ opacity: 0.5 }} />
                <p>Loading organizations...</p>
              </div>
            )}
            {!loading && error && (
              <div className="empty-state-large">
                <FontAwesomeIcon icon={faBuilding} size="3x" style={{ opacity: 0.3 }} />
                <h3>Failed to load organizations</h3>
                <p>{error}</p>
              </div>
            )}
            {!loading && !error && (
              <div className="table-wrapper orgs-table-wrapper">
                <table className="data-table orgs-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Parent</th>
                      <th>Description</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: '#999' }}>
                          {searchQuery
                            ? 'No organizations match the current search.'
                            : 'No organizations found.'}
                        </td>
                      </tr>
                    ) : (
                      visibleRows.map(({ org, depth, hasChildren, isExpanded }) => (
                        <tr
                          key={org.id}
                          className={depth > 0 ? 'org-row-child' : 'org-row-root'}
                          onClick={() => org.id && toggleExpand(org.id)}
                        >
                          <td>
                            <div
                              className="org-name-cell"
                              style={{ paddingLeft: depth * 24 }}
                            >
                              {hasChildren ? (
                                <button
                                  className="org-expand-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(org.id);
                                  }}
                                  title={isExpanded ? 'Collapse' : 'Expand'}
                                >
                                  <FontAwesomeIcon
                                    icon={isExpanded ? faChevronDown : faChevronRight}
                                    fixedWidth
                                  />
                                </button>
                              ) : (
                                <span className="org-expand-spacer" />
                              )}
                              <div className="org-avatar">
                                <FontAwesomeIcon icon={faBuilding} />
                              </div>
                              <Link
                                to={`/organizations/${org.id}`}
                                className="org-name-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {org.name ?? '-'}
                              </Link>
                              {hasChildren && (
                                <span className="org-child-count">
                                  {(orgTree.childrenMap.get(org.id) ?? []).length}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            {org.entityType ? (
                              <span className="org-type-badge">{org.entityType}</span>
                            ) : (
                              <span style={{ color: '#999' }}>-</span>
                            )}
                          </td>
                          <td style={{ color: '#999', fontSize: 12 }}>
                            {org.parentEntityId
                              ? (orgNameById.get(org.parentEntityId) ?? 'Unknown')
                              : <span style={{ color: '#ccc' }}>—</span>}
                          </td>
                          <td className="org-description-cell">
                            {org.description || <span style={{ color: '#ccc' }}>—</span>}
                          </td>
                          <td style={{ color: '#999', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {formatDate(org.createdAt)}
                          </td>
                          <td>
                            <div className="org-action-buttons">
                              <button
                                className="action-btn edit"
                                title="Edit organization"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(org);
                                }}
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button
                                className="action-btn delete"
                                title="Delete organization"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm({ id: org.id, name: org.name ?? 'Unknown' });
                                }}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

      </section>

      {/* ── Delete Confirmation ──────────────────────────────────── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-panel delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Organization</h3>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#666', lineHeight: 1.6 }}>
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="delete-confirm-btn"
                disabled={deleteSubmitting}
                onClick={handleDeleteOrganization}
              >
                {deleteSubmitting ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOrganizationsPage;
