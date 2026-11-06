import { EntityLogoPicker, OrganizationPicker, RoleMemberPicker } from '../../common';
import { faEdit, faSave, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';
import { isImageFile, normalizeLogoImage } from '../../../utils/image';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { OrganizationPageContext } from '../OrganizationPage';
import { Role } from '../../../api/api.users';
import type { UpdateEntityRequest } from '../../../api/api.entities';
import { useAuth } from '../../../contexts/useAuth';
import { useEntityStore } from '../../../stores/entityStore';

function SettingsView() {
  const { organization, canManage, onUpdated } = useOutletContext<OrganizationPageContext>();
  const navigate = useNavigate();
  const { isAdmin: isGlobalAdmin } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const { entities, loadEntities, updateEntity, deleteEntity, uploadEntityLogo, deleteEntityLogo } =
    useEntityStore();

  // Moving an organization to another parent is reserved for the global admins.
  const canEditParent = isGlobalAdmin;

  const [form, setForm] = useState<UpdateEntityRequest>({
    name: organization.name ?? '',
    description: organization.description ?? '',
    entityType: organization.entityType ?? '',
    parentEntityId: organization.parentEntityId ?? '',
  });

  useEffect(() => {
    if (canEditParent) loadEntities();
  }, [canEditParent, loadEntities]);

  const parentName = useMemo(
    () => entities.find((entity) => entity.id === organization.parentEntityId)?.name ?? null,
    [entities, organization.parentEntityId],
  );

  // Excluding the organization excludes its descendants too, so the picker
  // can never move it inside itself.
  const excludeIds = useMemo(() => [organization.id], [organization.id]);

  if (!canManage) {
    return (
      <div className="empty-state-large">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!organization.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const dto: UpdateEntityRequest = {
        ...form,
        // Without the right to move it, the organization keeps the parent it has.
        parentEntityId: canEditParent
          ? form.parentEntityId || null
          : organization.parentEntityId ?? null,
      };
      await updateEntity(organization.id, dto);
      onUpdated({ ...organization, ...dto });
      setEditing(false);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!organization.id) return;
    const confirmed = confirm(
      `Are you sure you want to delete "${organization.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteEntity(organization.id);
      navigate('/organizations');
    } catch {
      alert('Failed to delete organization. Please try again.');
    }
  };

  // The logo is written on pick, not on Save: it is its own endpoint and the
  // server bumps a cache-busting version on every upload.
  const handleLogoSelected = async (file: File) => {
    if (!organization.id) return;
    if (!isImageFile(file)) {
      setLogoError('Please choose an image file.');
      return;
    }

    setLogoBusy(true);
    setLogoError(null);
    try {
      // Every logo is squared and trimmed here, so no tile depends on what the
      // uploader's file happened to look like.
      let logo: File;
      try {
        logo = await normalizeLogoImage(file);
      } catch {
        setLogoError('Could not read that image. Please try another.');
        return;
      }

      const updated = await uploadEntityLogo(organization.id, logo);
      if (updated) onUpdated(updated);
    } catch {
      setLogoError('Failed to upload the logo. Please try again.');
    } finally {
      setLogoBusy(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!organization.id) return;
    setLogoBusy(true);
    setLogoError(null);
    try {
      const updated = await deleteEntityLogo(organization.id);
      if (updated) onUpdated(updated);
    } catch {
      setLogoError('Failed to remove the logo. Please try again.');
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div>
      {/* General Settings */}
      <div className="info-card" style={{ marginBottom: 20 }}>
        <div className="info-card-header">
          <span className="info-card-title">General</span>
          {!editing && (
            <button className="secondary-btn" onClick={() => { setEditing(true); setSaveError(null); }} style={{ padding: '5px 12px' }}>
              <FontAwesomeIcon icon={faEdit} style={{ marginRight: 6 }} />
              Edit
            </button>
          )}
        </div>

        <div className="org-logo-field">
          <EntityLogoPicker
            logoUrl={organization.logoUrl}
            name={organization.name}
            busy={logoBusy}
            onFileSelected={handleLogoSelected}
            onRemove={handleLogoRemove}
          />
          {logoError && <p className="org-logo-error">{logoError}</p>}
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
            {canEditParent && (
              <div className="form-field">
                <label htmlFor="org-parent">Parent Organization</label>
                <OrganizationPicker
                  id="org-parent"
                  organizations={entities}
                  value={form.parentEntityId ?? ''}
                  onChange={(value) => setForm((f) => ({ ...f, parentEntityId: value }))}
                  allowNone
                  placeholder="— None (root level) —"
                  excludeIds={excludeIds}
                />
              </div>
            )}
            {saveError && (
              <p style={{ color: '#e53935', fontSize: 13, margin: 0 }}>{saveError}</p>
            )}
            <div className="form-actions">
              <button className="primary-btn" style={{ padding: '9px 18px', fontSize: 13 }} onClick={handleSave} disabled={saving}>
                <FontAwesomeIcon icon={faSave} style={{ marginRight: 6 }} />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="secondary-btn" onClick={() => setEditing(false)} disabled={saving}>
                <FontAwesomeIcon icon={faTimes} style={{ marginRight: 6 }} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="info-row">
              <span className="info-label">Name</span>
              <span className="info-value">{organization.name || '—'}</span>
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
            {canEditParent && (
              <div className="info-row">
                <span className="info-label">Parent Organization</span>
                <span className={`info-value${!organization.parentEntityId ? ' empty' : ''}`}>
                  {organization.parentEntityId ? parentName ?? 'Unknown' : 'None — root level'}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Staff and devices get their roles here, not on the Members tab. */}
      <div className="info-card" style={{ marginBottom: 20 }}>
        <div className="info-card-header">
          <span className="info-card-title">Coaches, Admins &amp; Service Accounts</span>
        </div>
        <div className="edit-form">
          <RoleMemberPicker
            id="org-coaches"
            organizationId={organization.id}
            role={Role.Coach}
            label="Coaches"
            placeholder="Add coaches"
          />
          <RoleMemberPicker
            id="org-admins"
            organizationId={organization.id}
            role={Role.OrganizationAdmin}
            label="Admins"
            placeholder="Add admins"
          />
          <RoleMemberPicker
            id="org-service-accounts"
            organizationId={organization.id}
            role={Role.ServiceAccount}
            label="Service Accounts"
            placeholder="Add service accounts"
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="danger-zone-card">
        <div className="danger-zone-title">Danger Zone</div>
        <div className="danger-zone-row">
          <div className="danger-zone-info">
            <h4>Delete Organization</h4>
            <p>Permanently delete this organization and all of its data. This cannot be undone.</p>
          </div>
          <button className="danger-btn-lg" onClick={handleDelete}>
            <FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
