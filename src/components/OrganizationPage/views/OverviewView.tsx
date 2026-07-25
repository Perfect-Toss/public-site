import { faEdit, faInfoCircle, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { OrganizationPageContext } from '../OrganizationPage';
import type { UpdateEntityRequest } from '../../../api/api.entities';
import { useEntityStore } from '../../../stores/entityStore';
import { useOutletContext } from 'react-router-dom';
import { useState } from 'react';

function OverviewView() {
  const { organization, isAdmin, onUpdated } = useOutletContext<OrganizationPageContext>();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { updateEntity } = useEntityStore();

  const [form, setForm] = useState<UpdateEntityRequest>({
    name: organization.name ?? '',
    description: organization.description ?? '',
    entityType: organization.entityType ?? '',
  });

  const handleEdit = () => {
    setForm({
      name: organization.name ?? '',
      description: organization.description ?? '',
      entityType: organization.entityType ?? '',
    });
    setSaveError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!organization.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateEntity(organization.id, form);
      onUpdated({ ...organization, ...form });
      setEditing(false);
    } catch {
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="org-overview-grid">
      {/* Details Card */}
      <div className="info-card">
        <div className="info-card-header">
          <span className="info-card-title">
            <FontAwesomeIcon icon={faInfoCircle} />
            Details
          </span>
          {isAdmin && !editing && (
            <button className="secondary-btn" onClick={handleEdit} style={{ padding: '5px 12px' }}>
              <FontAwesomeIcon icon={faEdit} style={{ marginRight: 6 }} />
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="edit-form">
            <div className="form-field">
              <label>Name</label>
              <input
                type="text"
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Description</label>
              <textarea
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Type</label>
              <input
                type="text"
                value={form.entityType ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, entityType: e.target.value }))}
              />
            </div>
            {saveError && (
              <p style={{ color: '#e53935', fontSize: 13, margin: 0 }}>{saveError}</p>
            )}
            <div className="form-actions">
              <button className="primary-btn" onClick={handleSave} disabled={saving} style={{ padding: '9px 18px', fontSize: 13 }}>
                <FontAwesomeIcon icon={faSave} style={{ marginRight: 6 }} />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="secondary-btn" onClick={handleCancel} disabled={saving}>
                <FontAwesomeIcon icon={faTimes} style={{ marginRight: 6 }} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="info-row">
              <span className="info-label">Name</span>
              <span className="info-value">{organization.name || <span className="empty">—</span>}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Description</span>
              <span className={`info-value${!organization.description ? ' empty' : ''}`}>
                {organization.description || 'No description provided'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Type</span>
              <span className={`info-value${!organization.entityType ? ' empty' : ''}`}>
                {organization.entityType || '—'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">ID</span>
              <span className="info-value" style={{ fontSize: 12, color: '#aaa', fontFamily: 'monospace' }}>
                {organization.id}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OverviewView;
