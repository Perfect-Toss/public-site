import '../../styles/page.css';
import './AdminMachinesPage.css';

import {
  faCog,
  faDesktop,
  faLaptop,
  faMicrochip,
  faSearch,
  faSort,
  faSortDown,
  faSortUp,
  faSpinner,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  createMachine,
  deleteMachine,
  fetchAllMachines,
  fetchAllTablets,
  updateMachine,
  type CreateMachineRequest,
  type Machine,
  type Tablet,
  type UpdateMachineRequest,
} from '../../api/api';
import { usePageData } from '../../hooks/usePageData';
import { formatDate } from '../../utils/format';

/* ─── Helpers ─────────────────────────────────────────────────────── */

type SortColumn = 'name' | 'machineId' | 'status' | 'purpose' | 'isPhysicalDevice' | 'createdAt';
type SortDir = 'asc' | 'desc';

function getStatusClass(status?: string | null): string {
  switch ((status ?? '').toLowerCase()) {
    case 'active':
      return 'active';
    case 'inactive':
      return 'inactive';
    case 'maintenance':
      return 'maintenance';
    default:
      return 'pending';
  }
}

/* ─── Component ───────────────────────────────────────────────────── */

type TabId = 'all-machines';

export interface AdminMachinesPageHandle {
  openAddForm: () => void;
}

const AdminMachinesPage = forwardRef<AdminMachinesPageHandle>(function AdminMachinesPage(_props: unknown, ref) {
  const [activeTab, setActiveTab] = useState<TabId>('all-machines');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDir>('asc');

  const { data: machines, loading, error, load } = usePageData<Machine[]>([]);

  // ── Form state ──────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    machineId: '',
    isPhysicalDevice: true,
    purpose: '',
    status: 'Active',
    mustHaveDate: '',
    tabletId: '',
    comments: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formResult, setFormResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Delete confirm state ────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Machine | null>(null);

  // ── Tablets list for assignment dropdown ────────────────────────
  const { data: tablets, load: loadTablets } = usePageData<Tablet[]>([]);

  useEffect(() => {
    load(fetchAllMachines);
    loadTablets(fetchAllTablets);
  }, [load, loadTablets]);

  /* ─── Sorting & Filtering ─────────────────────────────────────── */

  const sortedMachines = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = machines.filter((m) => {
      return (
        (m.name ?? '').toLowerCase().includes(q) ||
        (m.machineId ?? '').toLowerCase().includes(q) ||
        (m.purpose ?? '').toLowerCase().includes(q) ||
        (m.status ?? '').toLowerCase().includes(q) ||
        (m.tablet?.name ?? '').toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '');
          break;
        case 'machineId':
          cmp = (a.machineId ?? '').localeCompare(b.machineId ?? '');
          break;
        case 'status':
          cmp = (a.status ?? '').localeCompare(b.status ?? '');
          break;
        case 'purpose':
          cmp = (a.purpose ?? '').localeCompare(b.purpose ?? '');
          break;
        case 'isPhysicalDevice':
          cmp = (a.isPhysicalDevice === b.isPhysicalDevice) ? 0 : a.isPhysicalDevice ? -1 : 1;
          break;
        case 'createdAt':
          cmp = (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [machines, searchQuery, sortColumn, sortDirection]);

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
    setEditingMachine(null);
    setFormData({ name: '', machineId: '', isPhysicalDevice: true, purpose: '', status: 'Active', mustHaveDate: '', tabletId: '', comments: '' });
    setFormResult(null);
    setShowForm(true);
  };

  const openEditForm = (machine: Machine) => {
    setEditingMachine(machine);
    setFormData({
      name: machine.name ?? '',
      machineId: machine.machineId ?? '',
      isPhysicalDevice: machine.isPhysicalDevice,
      purpose: machine.purpose ?? '',
      status: machine.status ?? 'Active',
      mustHaveDate: machine.mustHaveDate ?? '',
      tabletId: machine.tabletId ?? '',
      comments: machine.comments ?? '',
    });
    setFormResult(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingMachine(null);
    setFormResult(null);
  };

  /* ─── Submit Form ─────────────────────────────────────────────── */

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim() || !formData.machineId.trim()) return;

    setFormSubmitting(true);
    setFormResult(null);

    try {
      if (editingMachine) {
        const dto: UpdateMachineRequest = {
          name: formData.name.trim(),
          machineId: formData.machineId.trim(),
          isPhysicalDevice: formData.isPhysicalDevice,
          purpose: formData.purpose.trim() || undefined,
          status: formData.status.trim() || undefined,
          mustHaveDate: formData.mustHaveDate || undefined,
          tabletId: formData.tabletId || null,
        };
        await updateMachine(editingMachine.id, dto);
        setFormResult({ type: 'success', message: 'Machine updated successfully!' });
      } else {
        const dto: CreateMachineRequest = {
          name: formData.name.trim(),
          machineId: formData.machineId.trim(),
          isPhysicalDevice: formData.isPhysicalDevice,
          purpose: formData.purpose.trim() || undefined,
          status: formData.status.trim() || undefined,
          mustHaveDate: formData.mustHaveDate || undefined,
          tabletId: formData.tabletId || null,
        };
        await createMachine(dto);
        setFormResult({ type: 'success', message: 'Machine created successfully!' });
        setFormData({ name: '', machineId: '', isPhysicalDevice: true, purpose: '', status: 'Active', mustHaveDate: '', tabletId: '', comments: '' });
      }

      load(fetchAllMachines);

      // Auto-close after a short delay on success
      setTimeout(() => {
        closeForm();
      }, 1200);
    } catch (err) {
      setFormResult({ type: 'error', message: err instanceof Error ? err.message : 'An error occurred.' });
    } finally {
      setFormSubmitting(false);
    }
  }, [formData, editingMachine, load]);

  /* ─── Delete ──────────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    try {
      await deleteMachine(deleteTarget.id);
      setDeleteTarget(null);
      load(fetchAllMachines);
    } catch (err) {
      console.error('Failed to delete machine:', err);
      setDeleteTarget(null);
    }
  }, [deleteTarget, load]);

  useImperativeHandle(ref, () => ({ openAddForm }), []);

  /* ─── Render ──────────────────────────────────────────────────── */

  return (
    <div className="admin-machines-page">
      <section className="section">
        {/* ─── Toolbar ───────────────────────────────────────── */}
        <div className="table-toolbar">
          <div className="search-box">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search machines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="table-result-count">
            {sortedMachines.length} machine{sortedMachines.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ─── Table ─────────────────────────────────────────── */}
        <div className="machines-table-wrapper">
          <table className="machines-table">
            <thead>
              <tr>
                <th className="sortable-header" onClick={() => handleSort('name')}>
                  Name {renderSortIcon('name')}
                </th>
                <th className="sortable-header" onClick={() => handleSort('machineId')}>
                  Machine ID {renderSortIcon('machineId')}
                </th>
                <th className="sortable-header" onClick={() => handleSort('isPhysicalDevice')}>
                  Type {renderSortIcon('isPhysicalDevice')}
                </th>
                <th className="sortable-header" onClick={() => handleSort('status')}>
                  Status {renderSortIcon('status')}
                </th>
                <th className="sortable-header" onClick={() => handleSort('purpose')}>
                  Purpose {renderSortIcon('purpose')}
                </th>
                <th>Assigned Tablet</th>
                <th className="sortable-header" onClick={() => handleSort('createdAt')}>
                  Created {renderSortIcon('createdAt')}
                </th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr className="loading-row">
                  <td colSpan={8}>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                    Loading machines...
                  </td>
                </tr>
              )}
              {error && (
                <tr className="error-row">
                  <td colSpan={8}>Failed to load machines. Please try again.</td>
                </tr>
              )}
              {!loading && !error && sortedMachines.length === 0 && (
                <tr className="loading-row">
                  <td colSpan={8}>
                    <div className="empty-state">
                      <FontAwesomeIcon icon={faMicrochip} size="3x" />
                      <p>No machines found. Add your first machine to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && !error && sortedMachines.map((machine) => (
                <tr key={machine.id}>
                  <td>
                    <strong>{machine.name}</strong>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                    {machine.machineId}
                  </td>
                  <td>
                    <span className={`device-badge ${machine.isPhysicalDevice ? 'physical' : 'virtual'}`}>
                      <FontAwesomeIcon
                        icon={machine.isPhysicalDevice ? faDesktop : faLaptop}
                        style={{ marginRight: 4 }}
                        size="sm"
                      />
                      {machine.isPhysicalDevice ? 'Physical' : 'Virtual'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(machine.status)}`}>
                      {machine.status || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ color: '#666', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {machine.purpose || '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                    {machine.tablet?.name || '—'}
                  </td>
                  <td style={{ color: '#999', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {machine.createdAt ? formatDate(machine.createdAt) : '—'}
                  </td>
                  <td>
                    <button className="action-btn edit" onClick={() => openEditForm(machine)} title="Edit machine">
                      <FontAwesomeIcon icon={faCog} />
                    </button>
                    <button className="action-btn delete" onClick={() => setDeleteTarget(machine)} title="Delete machine">
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
            <h3>{editingMachine ? 'Edit Machine' : 'Add New Machine'}</h3>

            {formResult && (
              <div className={`form-result ${formResult.type}`}>
                {formResult.message}
              </div>
            )}

            <div className="form-group">
              <label>Machine Name *</label>
              <input
                type="text"
                placeholder="e.g. Field Machine 1"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Machine ID *</label>
              <input
                type="text"
                placeholder="e.g. MCH-001"
                value={formData.machineId}
                onChange={(e) => setFormData((prev) => ({ ...prev, machineId: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="form-group">
              <label>Purpose</label>
              <input
                type="text"
                placeholder="e.g. Tossing practice, Competition"
                value={formData.purpose}
                onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isPhysicalDevice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isPhysicalDevice: e.target.checked }))}
                />
                Physical Device
              </label>
            </div>

            <div className="form-group">
              <label>Must-Have Date</label>
              <input
                type="date"
                value={formData.mustHaveDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, mustHaveDate: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Assigned Tablet</label>
              <select
                value={formData.tabletId}
                onChange={(e) => setFormData((prev) => ({ ...prev, tabletId: e.target.value }))}
              >
                <option value="">— None —</option>
                {tablets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || 'Unnamed'} {t.tabletUserId ? `(${t.tabletUserId})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Comments</label>
              <textarea
                placeholder="Optional notes about this machine..."
                value={formData.comments}
                onChange={(e) => setFormData((prev) => ({ ...prev, comments: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button className="cancel-btn" onClick={closeForm}>Cancel</button>
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={formSubmitting || !formData.name.trim() || !formData.machineId.trim()}
              >
                {formSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                    Saving...
                  </>
                ) : (
                  editingMachine ? 'Update Machine' : 'Create Machine'
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
            <h3>Delete Machine</h3>
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

export default AdminMachinesPage;
