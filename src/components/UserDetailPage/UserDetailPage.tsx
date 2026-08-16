import '../../styles/page.css';
import './UserDetailPage.css';

import {
  Role,
  deleteUserThumbnail,
  isAdminUser,
  type UpdateUserDto,
  type User,
  uploadUserThumbnail,
} from '../../api/api.users';
import type { Role as RoleType } from '../../utils/roles';
import {
  faArrowLeft,
  faBuilding,
  faCamera,
  faCheckCircle,
  faChevronDown,
  faSave,
  faSpinner,
  faTimes,
  faTrash,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { getDisplayName, renderRoleBadges } from '../../utils/user';
import { UserAvatar } from '../common';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { Entity } from '../../api/api.entities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatDate } from '../../utils/format';
import { useEntityStore } from '../../stores/entityStore';
import { useUserStore } from '../../stores/userStore';

/* ─── Shared detail field component ───────────────────────────────── */

function DetailField({
  label,
  editing,
  displayValue,
  children,
}: {
  label: string;
  editing: boolean;
  displayValue: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="detail-field">
      <span className="detail-field-label">{label}</span>
      {editing ? children : <span className="detail-field-value">{displayValue}</span>}
    </div>
  );
}

/* ─── Component ───────────────────────────────────────────────────── */

function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const isAdmin = isAdminUser(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [thumbnailSaving, setThumbnailSaving] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    firstName: string;
    lastName: string;
    heightInInches: string;
    birthdate: string;
    roles: Role[];
  }>({ firstName: '', lastName: '', heightInInches: '', birthdate: '', roles: [] });

  const [entities, setEntities] = useState<Entity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const { loadUserById, updateUser } = useUserStore();
  const { loadEntitiesForUser } = useEntityStore();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    loadUserById(id)
      .then(setUser)
      .catch((err) => {
        console.error('Failed to load user:', err);
        setError('Could not load user details.');
      })
      .finally(() => setLoading(false));
  }, [id, loadUserById]);

  // Load associated entities when user is available
  useEffect(() => {
    if (!user?.id) return;
    setEntitiesLoading(true);
    loadEntitiesForUser(user.id)
      .then(setEntities)
      .catch((err) => console.error('Failed to load user entities:', err))
      .finally(() => setEntitiesLoading(false));
  }, [user?.id, loadEntitiesForUser]);

  // Populate edit form when user loads or editing starts
  useEffect(() => {
    if (user && isEditing) {
      setEditForm({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        heightInInches: user.heightInInches != null ? String(user.heightInInches) : '',
        birthdate: user.birthdate ?? '',
        roles: [...(user.roles as RoleType[] | null) ?? []],
      });
    }
  }, [user, isEditing]);

  const refreshUser = useCallback(async () => {
    if (!id) return;
    const updated = await loadUserById(id);
    setUser(updated);
  }, [id, loadUserById]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const dto: UpdateUserDto = {
        id: user.id,
        firstName: editForm.firstName.trim() || null,
        lastName: editForm.lastName.trim() || null,
        heightInInches: editForm.heightInInches ? Number(editForm.heightInInches) : null,
        birthdate: editForm.birthdate.trim() || null,
        roles: editForm.roles.length > 0 ? editForm.roles : null,
      };
      await updateUser(dto);
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save user:', err);
    } finally {
      setSaving(false);
    }
  }, [user, editForm, updateUser, refreshUser]);

  const handleThumbnailUpload = useCallback(async (file: File) => {
    if (!user?.id) return;
    setThumbnailSaving(true);
    try {
      await uploadUserThumbnail(user.id, file);
      await refreshUser();
    } catch (err) {
      console.error('Failed to upload thumbnail:', err);
    } finally {
      setThumbnailSaving(false);
    }
  }, [user?.id, refreshUser]);

  const handleThumbnailRemove = useCallback(async () => {
    if (!user?.id) return;
    setThumbnailSaving(true);
    try {
      await deleteUserThumbnail(user.id);
      await refreshUser();
    } catch (err) {
      console.error('Failed to remove thumbnail:', err);
    } finally {
      setThumbnailSaving(false);
    }
  }, [user?.id, refreshUser]);

  return (
    <div className="user-detail-page">
      <button className="user-detail-back" onClick={() => navigate(-1)}>
        <FontAwesomeIcon icon={faArrowLeft} />
        Back to Users
      </button>

      <section className="section">
        {loading && (
          <div className="detail-loading">
            <FontAwesomeIcon icon={faSpinner} size="3x" spin />
            <p>Loading user details...</p>
          </div>
        )}

        {!loading && (error || !user) && (
          <div className="detail-error">
            <FontAwesomeIcon icon={faUser} size="3x" style={{ opacity: 0.3 }} />
            <h3>{error ? 'Failed to load user' : 'User not found'}</h3>
            <p>{error || 'The requested user could not be found.'}</p>
            <button className="primary-btn" onClick={() => navigate(-1)}>
              <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />
              Back
            </button>
          </div>
        )}

        {!loading && !error && user && (
          <div className="user-detail-card">
            <div className="user-detail-header">
              <div className="thumbnail-edit-wrapper">
                <UserAvatar user={user} size={72} />
                {isAdmin && (
                  <div className="thumbnail-edit-actions">
                    <label className={`thumbnail-upload-btn ${thumbnailSaving ? 'disabled' : ''}`} title="Upload photo">
                      <FontAwesomeIcon icon={faCamera} />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={thumbnailSaving}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          handleThumbnailUpload(file);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {user.thumbnailUrl && (
                      <button
                        className="thumbnail-remove-btn"
                        title="Remove photo"
                        disabled={thumbnailSaving}
                        onClick={handleThumbnailRemove}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="user-detail-heading">
                <h2>{getDisplayName(user)}</h2>
                <p className="email">{user.email || '-'}</p>
              </div>
              {isAdmin && !isEditing && (
                <button className="detail-edit-btn" onClick={() => setIsEditing(true)}>
                  <FontAwesomeIcon icon={faSave} style={{ marginRight: 6 }} />
                  Edit
                </button>
              )}
              {isAdmin && isEditing && (
                <div className="detail-edit-actions">
                  <button className="detail-save-btn" onClick={handleSave} disabled={saving}>
                    <FontAwesomeIcon icon={faSave} style={{ marginRight: 6 }} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="detail-cancel-btn" onClick={cancelEditing} disabled={saving}>
                    <FontAwesomeIcon icon={faTimes} style={{ marginRight: 6 }} />
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="user-detail-body">
              {/* Roles & Status */}
              <div className="user-detail-section">
                <h3>Roles &amp; Status</h3>
                <div className="detail-grid">
                  <div className="detail-field">
                    <span className="detail-field-label">Roles</span>
                    {isEditing ? (
                      <div className="multi-select-wrapper">
                        <div
                          className="multi-select-trigger"
                          onClick={() => setRoleDropdownOpen((o) => !o)}
                        >
                          <div className="multi-select-tags">
                            {editForm.roles.length === 0 ? (
                              <span className="multi-select-placeholder">Select roles...</span>
                            ) : (
                              editForm.roles.map((r) => (
                                <span key={r} className={`role-badge ${r.toLowerCase()}`}>{r}</span>
                              ))
                            )}
                          </div>
                          <FontAwesomeIcon icon={faChevronDown} className={`multi-select-chevron ${roleDropdownOpen ? 'open' : ''}`} />
                        </div>
                        {roleDropdownOpen && (
                          <>
                            <div className="multi-select-backdrop" onClick={() => setRoleDropdownOpen(false)} />
                            <div className="multi-select-dropdown">
                              {Object.values(Role).map((role) => (
                                <label
                                  key={role}
                                  className={`multi-select-option ${editForm.roles.includes(role) ? 'selected' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={editForm.roles.includes(role)}
                                    onChange={() => {
                                      setEditForm((f) => ({
                                        ...f,
                                        roles: f.roles.includes(role)
                                          ? f.roles.filter((r) => r !== role)
                                          : [...f.roles, role],
                                      }));
                                    }}
                                  />
                                  <span className={`role-badge ${role.toLowerCase()}`}>{role}</span>
                                </label>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="detail-field-value detail-roles-list">
                        {renderRoleBadges(user.roles)}
                      </span>
                    )}
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Status</span>
                    <span className="detail-field-value">
                      {user.isDeleted ? (
                        <span style={{ color: '#999' }}>Inactive</span>
                      ) : user.isEmailVerified ? (
                        <span style={{ color: '#4caf50' }}>
                          <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: 4 }} />
                          Verified
                        </span>
                      ) : (
                        <span style={{ color: '#ff9800' }}>Pending</span>
                      )}
                    </span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Terms Accepted</span>
                    <span className="detail-field-value">
                      {user.acceptedTerms ? (
                        <span style={{ color: '#4caf50' }}>Yes</span>
                      ) : (
                        <span style={{ color: '#999' }}>No</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="user-detail-section">
                <h3>Personal Info</h3>
                <div className="detail-grid">
                  <DetailField label="First Name" editing={isEditing} displayValue={user.firstName || '-'}>
                    <input
                      className="detail-input"
                      type="text"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    />
                  </DetailField>
                  <DetailField label="Last Name" editing={isEditing} displayValue={user.lastName || '-'}>
                    <input
                      className="detail-input"
                      type="text"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    />
                  </DetailField>
                  <DetailField
                    label="Height (in)"
                    editing={isEditing}
                    displayValue={user.heightInInches != null ? `${user.heightInInches} in` : '-'}
                  >
                    <input
                      className="detail-input"
                      type="number"
                      min="0"
                      step="0.1"
                      value={editForm.heightInInches}
                      onChange={(e) => setEditForm((f) => ({ ...f, heightInInches: e.target.value }))}
                    />
                  </DetailField>
                  <DetailField label="Birthdate" editing={isEditing} displayValue={formatDate(user.birthdate)}>
                    <input
                      className="detail-input"
                      type="date"
                      value={editForm.birthdate}
                      onChange={(e) => setEditForm((f) => ({ ...f, birthdate: e.target.value }))}
                    />
                  </DetailField>
                </div>
              </div>

              {/* Associated Entities */}
              <div className="user-detail-section">
                <h3>Associated Entities</h3>
                {entitiesLoading ? (
                  <div style={{ padding: '16px 0', color: '#999', fontSize: 13 }}>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                    Loading entities...
                  </div>
                ) : entities.length === 0 ? (
                  <div style={{ padding: '16px 0', color: '#999', fontSize: 13 }}>
                    No associated entities found.
                  </div>
                ) : (
                  <div className="entities-list">
                    {entities.map((entity) => (
                      <div
                        key={entity.id}
                        className="entity-card"
                        onClick={() => navigate(`/organizations/${entity.id}`)}
                      >
                        <div className="entity-card-icon">
                          <FontAwesomeIcon icon={faBuilding} />
                        </div>
                        <div className="entity-card-info">
                          <span className="entity-card-name">{entity.name || 'Untitled'}</span>
                          {entity.entityType && (
                            <span className="entity-card-type">{entity.entityType}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Info */}
              <div className="user-detail-section">
                <h3>System Info</h3>
                <div className="detail-grid">
                  <div className="detail-field">
                    <span className="detail-field-label">Created</span>
                    <span className="detail-field-value">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Last Modified</span>
                    <span className="detail-field-value">{formatDate(user.lastModifiedAt)}</span>
                  </div>
                  <div className="detail-field full-width">
                    <span className="detail-field-label">User ID</span>
                    <span className="detail-field-value mono">{user.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default UserDetailPage;
