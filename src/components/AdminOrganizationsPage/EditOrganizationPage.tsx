import '../../styles/page.css';
import '../../styles/admin-form.css';
import './AdminOrganizationsPage.css';

import { OrganizationPicker, RoleMemberPicker } from '../common';
import {
  faArrowLeft,
  faCheck,
  faSpinner,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Role } from '../../api/api.users';
import type { UpdateEntityRequest } from '../../api/api.entities';
import { useEntityStore } from '../../stores/entityStore';

function EditOrganizationPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const { entities: organizations, loadEntities, loadEntityById, updateEntity } = useEntityStore();

  const [editForm, setEditForm] = useState({ name: '', description: '', entityType: '', parentEntityId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loadingEntity, setLoadingEntity] = useState(false);

  // The organization being edited can't be moved inside itself.
  const excludeIds = useMemo(() => (orgId ? [orgId] : []), [orgId]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  useEffect(() => {
    if (orgId) {
      setLoadingEntity(true);
      loadEntityById(orgId)
        .then((org) => {
          if (org) {
            setEditForm({
              name: org.name ?? '',
              description: org.description ?? '',
              entityType: org.entityType ?? '',
              parentEntityId: org.parentEntityId ?? '',
            });
          }
        })
        .catch(() => {
          setResult({ type: 'error', message: 'Failed to load organization.' });
        })
        .finally(() => setLoadingEntity(false));
    }
  }, [orgId, loadEntityById]);

  const handleSubmit = useCallback(async () => {
    if (!orgId || !editForm.name.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const dto: UpdateEntityRequest = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        entityType: editForm.entityType.trim() || undefined,
        parentEntityId: editForm.parentEntityId || undefined,
      };
      await updateEntity(orgId, dto);
      setResult({ type: 'success', message: 'Organization updated successfully!' });
      setTimeout(() => {
        navigate('/admin/organizations');
      }, 1200);
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update organization.' });
    } finally {
      setSubmitting(false);
    }
  }, [orgId, editForm, navigate, updateEntity]);

  if (loadingEntity) {
    return (
    <div className="admin-orgs-page admin-form-page">
        <section className="section">
          <div className="loading-container" style={{ minHeight: 200 }}>
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-orgs-page admin-form-page">
      <section className="section">
        <div className="section-header">
          <button className="back-btn" onClick={() => navigate('/admin/organizations')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
          <h2>Edit Organization</h2>
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
            <label htmlFor="edit-name">Organization Name *</label>
            <input
              id="edit-name"
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-type">Type</label>
            <input
              id="edit-type"
              type="text"
              value={editForm.entityType}
              onChange={(e) => setEditForm((f) => ({ ...f, entityType: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-parent">Parent Organization</label>
            <OrganizationPicker
              id="edit-parent"
              organizations={organizations}
              value={editForm.parentEntityId}
              onChange={(v) => setEditForm((f) => ({ ...f, parentEntityId: v }))}
              allowNone
              placeholder="— None (root level) —"
              excludeIds={excludeIds}
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button className="cancel-btn" onClick={() => navigate('/admin/organizations')}>
              Cancel
            </button>
            <button
              className="submit-btn"
              disabled={!editForm.name.trim() || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : null}
              Save Changes
            </button>
          </div>
        </div>

        {/* Staff and devices get their roles here, not on the Members tab. */}
        {orgId && (
          <div className="admin-form-card">
            <h3 style={{ marginTop: 0 }}>Coaches, Admins &amp; Service Accounts</h3>
            <RoleMemberPicker
              id="edit-org-coaches"
              organizationId={orgId}
              role={Role.Coach}
              label="Coaches"
              placeholder="Add coaches"
            />
            <RoleMemberPicker
              id="edit-org-admins"
              organizationId={orgId}
              role={Role.OrganizationAdmin}
              label="Admins"
              placeholder="Add admins"
            />
            <RoleMemberPicker
              id="edit-org-service-accounts"
              organizationId={orgId}
              role={Role.ServiceAccount}
              label="Service Accounts"
              placeholder="Add service accounts"
            />
          </div>
        )}
      </section>
    </div>
  );
}

export default EditOrganizationPage;
