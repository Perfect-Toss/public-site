import '../../styles/page.css';
import '../../styles/admin-form.css';
import './AdminTabletsPage.css';

import type { CreateTabletRequest, UpdateTabletRequest } from '../../api/api.tablets';
import {
  faArrowLeft,
  faCheck,
  faSpinner,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTabletStore } from '../../stores/tabletStore';
import { useUserStore } from '../../stores/userStore';

function TabletFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

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
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loadingEntity, setLoadingEntity] = useState(false);

  const { tabletTypes, tabletTypesLoading, loadTabletTypes, loadTabletById, createTablet, updateTablet } = useTabletStore();
  const { serviceAccounts, serviceAccountsLoading, loadServiceAccounts } = useUserStore();

  useEffect(() => {
    loadTabletTypes();
    loadServiceAccounts();
  }, [loadTabletTypes, loadServiceAccounts]);

  // Load tablet data for editing
  useEffect(() => {
    if (id) {
      setLoadingEntity(true);
      loadTabletById(id)
        .then((tablet) => {
          if (tablet) {
            setFormData({
              name: tablet.name ?? '',
              tabletUserId: tablet.tabletUserId ?? '',
              pin: tablet.pin ?? '',
              serviceAccountId: tablet.serviceAccountId ?? '',
              cover: tablet.cover ?? false,
              holder: tablet.holder ?? false,
              tripod: tablet.tripod ?? false,
              tabletTypeId: tablet.tabletTypeId ?? '',
            });
          }
        })
        .catch(() => {
          setResult({ type: 'error', message: 'Failed to load tablet.' });
        })
        .finally(() => setLoadingEntity(false));
    }
  }, [id, loadTabletById]);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      if (isEditing && id) {
        const dto: UpdateTabletRequest = {
          name: formData.name.trim() || undefined,
          tabletUserId: formData.tabletUserId.trim() || undefined,
          pin: formData.pin.trim() || undefined,
          serviceAccountId: formData.serviceAccountId || null,
          cover: formData.cover || undefined,
          holder: formData.holder || undefined,
          tripod: formData.tripod || undefined,
          tabletTypeId: formData.tabletTypeId.trim() || undefined,
        };
        await updateTablet(id, dto);
        setResult({ type: 'success', message: 'Tablet updated successfully!' });
      } else {
        const dto: CreateTabletRequest = {
          name: formData.name.trim() || undefined,
          tabletUserId: formData.tabletUserId.trim() || undefined,
          pin: formData.pin.trim() || undefined,
          serviceAccountId: formData.serviceAccountId || null,
          cover: formData.cover || undefined,
          holder: formData.holder || undefined,
          tripod: formData.tripod || undefined,
          tabletTypeId: formData.tabletTypeId.trim() || undefined,
        };
        await createTablet(dto);
        setResult({ type: 'success', message: 'Tablet created successfully!' });
      }

      setTimeout(() => {
        navigate('/admin/devices/tablets');
      }, 1200);
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'An error occurred.' });
    } finally {
      setSubmitting(false);
    }
  }, [formData, isEditing, id, navigate, createTablet, updateTablet]);

  if (loadingEntity) {
    return (
    <div className="admin-tablets-page admin-form-page">
        <section className="section">
          <div className="loading-container" style={{ minHeight: 200 }}>
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-tablets-page admin-form-page">
      <section className="section">
        <div className="section-header">
          <button className="back-btn" onClick={() => navigate('/admin/devices/tablets')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
          <h2>{isEditing ? 'Edit Tablet' : 'Add Tablet'}</h2>
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
              type="text"
              inputMode="numeric"
              placeholder="e.g. 1234"
              value={formData.pin}
              onChange={(e) => setFormData((prev) => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
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
            <label>Tablet Type</label>
            <select
              value={formData.tabletTypeId}
              onChange={(e) => setFormData((prev) => ({ ...prev, tabletTypeId: e.target.value }))}
            >
              <option value="">— None —</option>
              {tabletTypesLoading && (
                <option value="" disabled>Loading...</option>
              )}
              {!tabletTypesLoading && tabletTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.model || tt.id}
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
            <button className="cancel-btn" onClick={() => navigate('/admin/devices/tablets')}>
              Cancel
            </button>
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !formData.name.trim()}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                  Saving...
                </>
              ) : (
                <>
                  {isEditing ? 'Update Tablet' : 'Create Tablet'}
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TabletFormPage;
