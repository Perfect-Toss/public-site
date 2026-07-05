import '../../styles/page.css';
import '../../styles/admin-form.css';
import './AdminMachinesPage.css';

import {
  faArrowLeft,
  faSpinner,
  faCheck,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createMachine,
  fetchAllTablets,
  fetchMachineById,
  updateMachine,
  type CreateMachineRequest,
  type Tablet,
  type UpdateMachineRequest,
} from '../../api/api';
import { usePageData } from '../../hooks/usePageData';

function MachineFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

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
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loadingEntity, setLoadingEntity] = useState(false);

  const { data: tablets, load: loadTablets } = usePageData<Tablet[]>([]);

  useEffect(() => {
    loadTablets(fetchAllTablets);
  }, [loadTablets]);

  // Load machine data for editing
  useEffect(() => {
    if (id) {
      setLoadingEntity(true);
      fetchMachineById(id)
        .then((machine) => {
          if (machine) {
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
          }
        })
        .catch(() => {
          setResult({ type: 'error', message: 'Failed to load machine.' });
        })
        .finally(() => setLoadingEntity(false));
    }
  }, [id]);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim() || !formData.machineId.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      if (isEditing && id) {
        const dto: UpdateMachineRequest = {
          name: formData.name.trim(),
          machineId: formData.machineId.trim(),
          isPhysicalDevice: formData.isPhysicalDevice,
          purpose: formData.purpose.trim() || undefined,
          status: formData.status.trim() || undefined,
          mustHaveDate: formData.mustHaveDate || undefined,
          tabletId: formData.tabletId || null,
        };
        await updateMachine(id, dto);
        setResult({ type: 'success', message: 'Machine updated successfully!' });
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
        setResult({ type: 'success', message: 'Machine created successfully!' });
      }

      setTimeout(() => {
        navigate('/admin/devices/machines');
      }, 1200);
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'An error occurred.' });
    } finally {
      setSubmitting(false);
    }
  }, [formData, isEditing, id, navigate]);

  if (loadingEntity) {
    return (
      <div className="admin-machines-page admin-form-page">
        <section className="section">
          <div className="loading-container" style={{ minHeight: 200 }}>
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-machines-page admin-form-page">
      <section className="section">
        <div className="section-header">
          <button className="back-btn" onClick={() => navigate('/admin/devices/machines')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
          <h2>{isEditing ? 'EDIT MACHINE' : 'ADD MACHINE'}</h2>
          <div />
        </div>

        {result && (
          <div className={`import-result ${result.type}`} style={{ marginBottom: 20 }}>
            <FontAwesomeIcon
              icon={result.type === 'success' ? faCheck : faTimes}
              style={{ marginRight: 8 }}
            />
            {result.message}
          </div>
        )}

        <div className="admin-form-card">
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
            <button className="cancel-btn" onClick={() => navigate('/admin/devices/machines')}>
              Cancel
            </button>
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !formData.name.trim() || !formData.machineId.trim()}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                  Saving...
                </>
              ) : (
                <>
                  {isEditing ? 'Update Machine' : 'Create Machine'}
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MachineFormPage;
