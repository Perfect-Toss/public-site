import '../../styles/page.css';
import './UserDetailPage.css';

import type { Roles, UpdateUserDto, User } from '../../api/api.users';
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
import { getDisplayName, getInitials, isLightColor, renderRoleBadges } from '../../utils/user';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { Entity } from '../../api/api.entities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatDate } from '../../utils/format';
import { useAuth } from '../../contexts/useAuth';
import { useEntityStore } from '../../stores/entityStore';
import { useUserStore } from '../../stores/userStore';

/* ─── Component ───────────────────────────────────────────────────── */

function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [user, setUser] = useState<User | null>(null);
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
    roles: Roles[];
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
        roles: [...(user.roles as Roles[] | null) ?? []],
      });
    }
  }, [user, isEditing]);

  const startEditing = useCallback(() => {
    if (!user) return;
    setEditForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      heightInInches: user.heightInInches != null ? String(user.heightInInches) : '',
      birthdate: user.birthdate ?? '',
      roles: [...(user.roles as Roles[] | null) ?? []],
    });
    setIsEditing(true);
  }, [user]);

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
      // Refresh user data
      const updated = await loadUserById(user.id);
      setUser(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save user:', err);
    } finally {
      setSaving(false);
    }
  }, [user, editForm, updateUser, loadUserById]);

  const buildSafeThumbnailDto = useCallback((overrides: { thumbnailImage: string | null }) => ({
    id: user!.id,
    firstName: user!.firstName ?? null,
    lastName: user!.lastName ?? null,
    heightInInches: user!.heightInInches ?? null,
    birthdate: user!.birthdate ?? null,
    roles: (user!.roles as Roles[] | null) ?? null,
    ...overrides,
  }), [user]);

  const handleThumbnailUpload = useCallback(async (file: File) => {
    if (!user?.id) return;
    setThumbnailSaving(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        await updateUser(buildSafeThumbnailDto({ thumbnailImage: base64 }));
        const updated = await loadUserById(user.id);
        setUser(updated);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload thumbnail:', err);
    } finally {
      setThumbnailSaving(false);
    }
  }, [user, buildSafeThumbnailDto, updateUser, loadUserById]);

  const handleThumbnailRemove = useCallback(async () => {
    if (!user?.id) return;
    setThumbnailSaving(true);
    try {
      await updateUser(buildSafeThumbnailDto({ thumbnailImage: '' }));
      const updated = await loadUserById(user.id);
      setUser(updated);
    } catch (err) {
      console.error('Failed to remove thumbnail:', err);
    } finally {
      setThumbnailSaving(false);
    }
  }, [user, buildSafeThumbnailDto, loadUserById, updateUser]);

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

        {!loading && error && (
          <div className="detail-error">
            <FontAwesomeIcon icon={faUser} size="3x" style={{ opacity: 0.3 }} />
            <h3>Failed to load user</h3>
            <p>{error}</p>
            <button className="primary-btn" onClick={() => navigate(-1)}>
              <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />
              Back
            </button>
          </div>
        )}

        {!loading && !error && !user && (
          <div className="detail-error">
            <FontAwesomeIcon icon={faUser} size="3x" style={{ opacity: 0.3 }} />
            <h3>User not found</h3>
            <p>The requested user could not be found.</p>
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
                {user.thumbnailImage ? (
                  <img
                    className="user-detail-avatar-large user-detail-avatar-img"
                    src={`data:image/jpeg;base64,${user.thumbnailImage}`}
                    alt={getDisplayName(user)}
                  />
                ) : (
                  <div
                    className="user-detail-avatar-large"
                    style={user.colorHex ? {
                      background: user.colorHex,
                      color: isLightColor(user.colorHex) ? '#1a1f24' : '#fff',
                    } : undefined}
                  >{getInitials(user)}</div>
                )}
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
                    {user.thumbnailImage && (
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
                <button className="detail-edit-btn" onClick={startEditing}>
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
                              {(['Athlete','Coach','EntityAdmin','OrganizationAdmin','Admin','AlphaTester','BetaTester','SuperUser'] as const).map((role) => (
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
                  <div className="detail-field">
                    <span className="detail-field-label">First Name</span>
                    {isEditing ? (
                      <input
                        className="detail-input"
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                      />
                    ) : (
                      <span className="detail-field-value">{user.firstName || '-'}</span>
                    )}
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Last Name</span>
                    {isEditing ? (
                      <input
                        className="detail-input"
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                      />
                    ) : (
                      <span className="detail-field-value">{user.lastName || '-'}</span>
                    )}
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Height (in)</span>
                    {isEditing ? (
                      <input
                        className="detail-input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={editForm.heightInInches}
                        onChange={(e) => setEditForm((f) => ({ ...f, heightInInches: e.target.value }))}
                      />
                    ) : (
                      <span className="detail-field-value">
                        {user.heightInInches != null ? `${user.heightInInches} in` : '-'}
                      </span>
                    )}
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Birthdate</span>
                    {isEditing ? (
                      <input
                        className="detail-input"
                        type="date"
                        value={editForm.birthdate}
                        onChange={(e) => setEditForm((f) => ({ ...f, birthdate: e.target.value }))}
                      />
                    ) : (
                      <span className="detail-field-value">{formatDate(user.birthdate)}</span>
                    )}
                  </div>
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
