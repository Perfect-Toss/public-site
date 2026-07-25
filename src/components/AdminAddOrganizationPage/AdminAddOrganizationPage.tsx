import '../../styles/page.css';
import './AdminAddOrganizationPage.css';

import {
  faArrowLeft,
  faCheck,
  faPlus,
  faSpinner,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useState } from 'react';

import type { CreateEntityRequest } from '../../api/api.entities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEntityStore } from '../../stores/entityStore';
import { useNavigate } from 'react-router-dom';

function AdminAddOrganizationPage() {
  const navigate = useNavigate();
  const { entities: organizations, loadEntities, createEntity } = useEntityStore();

  const [form, setForm] = useState({ name: '', description: '', entityType: '', parentEntityId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const dto: CreateEntityRequest = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        entityType: form.entityType.trim() || undefined,
        parentEntityId: form.parentEntityId || undefined,
      };
      await createEntity(dto);
      navigate('/admin/organizations');
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create organization.' });
    } finally {
      setSubmitting(false);
    }
  }, [form, navigate, createEntity]);

  return (
    <div className="admin-add-org-page">
      <section className="section">
        <div className="section-header">
          <button className="back-btn" onClick={() => navigate('/admin/organizations')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
          <h2>ADD ORGANIZATION</h2>
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

        <div className="add-org-form">
          <div className="form-group">
            <label htmlFor="org-name">Organization Name *</label>
            <input
              id="org-name"
              type="text"
              placeholder="My Organization"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="org-type">Type</label>
            <input
              id="org-type"
              type="text"
              placeholder="e.g. School, Club, League"
              value={form.entityType}
              onChange={(e) => setForm((f) => ({ ...f, entityType: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="org-parent">Parent Organization</label>
            <select
              id="org-parent"
              value={form.parentEntityId}
              onChange={(e) => setForm((f) => ({ ...f, parentEntityId: e.target.value }))}
            >
              <option value="">— None (root level) —</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="org-description">Description</label>
            <textarea
              id="org-description"
              placeholder="Brief description of the organization..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button
              className="cancel-btn"
              onClick={() => navigate('/admin/organizations')}
            >
              Cancel
            </button>
            <button
              className="submit-btn"
              disabled={!form.name.trim() || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />
              )}
              Create Organization
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminAddOrganizationPage;
