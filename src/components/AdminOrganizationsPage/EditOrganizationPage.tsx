import '../../styles/page.css';
import '../../styles/admin-form.css';
import './AdminOrganizationsPage.css';

import {
  faArrowLeft,
  faCheck,
  faSpinner,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  type Entity,
  type UpdateEntityRequest,
  fetchAllEntities,
  fetchEntityById,
  updateEntity,
} from '../../api/api';
import { usePageData } from '../../hooks/usePageData';

function EditOrganizationPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const { data: organizations, load: loadOrganizations } = usePageData<Entity[]>([]);

  const [editForm, setEditForm] = useState({ name: '', description: '', entityType: '', parentEntityId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loadingEntity, setLoadingEntity] = useState(false);

  useEffect(() => {
    loadOrganizations(fetchAllEntities);
  }, [loadOrganizations]);

  useEffect(() => {
    if (orgId) {
      setLoadingEntity(true);
      fetchEntityById(orgId)
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
  }, [orgId]);

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
  }, [orgId, editForm, navigate]);

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
          <h2>EDIT ORGANIZATION</h2>
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
            <select
              id="edit-parent"
              value={editForm.parentEntityId}
              onChange={(e) => setEditForm((f) => ({ ...f, parentEntityId: e.target.value }))}
            >
              <option value="">— None (root level) —</option>
              {organizations
                .filter((org) => org.id !== orgId)
                .map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
            </select>
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
      </section>
    </div>
  );
}

export default EditOrganizationPage;
