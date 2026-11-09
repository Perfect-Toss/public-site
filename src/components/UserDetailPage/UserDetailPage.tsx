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
import { assignableRoles, canAssignRole } from '../../utils/roles';
import {
  faArrowLeft,
  faCamera,
  faCheckCircle,
  faChevronDown,
  faEye,
  faSave,
  faSpinner,
  faTimes,
  faTrash,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { getDisplayName, renderRoleBadges } from '../../utils/user';
import { IMAGE_ACCEPT, normalizeAvatarImage } from '../../utils/image';
import { HANDEDNESS_VALUES, formatUstaRating, ustaRatingOptions, type HandednessValue } from '../../utils/profile';
import { OrganizationCard, StyledSelect, UserAvatar } from '../common';
import { useAuth } from '../../contexts/useAuth';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { Entity } from '../../api/api.entities';
import { fetchEntitiesForUser } from '../../api/api.entities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatDate } from '../../utils/format';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import { startViewAs, useViewAsTarget } from '../../stores/viewAsStore';

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
    ustaRating: string;
    handedness: HandednessValue;
    roles: Role[];
  }>({
    firstName: '',
    lastName: '',
    heightInInches: '',
    birthdate: '',
    ustaRating: '',
    handedness: '',
    roles: [],
  });

  const [entities, setEntities] = useState<Entity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entitiesError, setEntitiesError] = useState<string | null>(null);
  const { loadUserById, updateUser } = useUserStore();
  const { currentUser } = useAuth();
  const signedInUser = useAuthStore((state) => state.user);
  const viewAsTarget = useViewAsTarget();
  /** Only an admin may emulate, and only while not already emulating. */
  const canViewAs =
    isAdminUser(signedInUser) && viewAsTarget === null && signedInUser?.id !== user?.id;

  /** Roles the acting user may grant — their own authority level and below. */
  const grantableRoles = assignableRoles(currentUser?.roles);

  /**
   * Roles the edited user holds that the acting user may not grant. They stay
   * on the account and render locked, so a lower admin can neither add nor
   * strip them.
   */
  const lockedRoles = editForm.roles.filter((r) => !canAssignRole(currentUser?.roles, r));

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

  // The organizations this user belongs to — one targeted call, never the
  // whole entity tree.
  useEffect(() => {
    if (!user?.id) return;

    let active = true;
    setEntitiesLoading(true);
    setEntitiesError(null);
    fetchEntitiesForUser(user.id)
      .then((rows) => {
        if (active) {
          setEntities(
            [...rows].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
          );
        }
      })
      .catch((err) => {
        console.error('Failed to load user entities:', err);
        if (active) setEntitiesError('Could not load associated entities.');
      })
      .finally(() => {
        if (active) setEntitiesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  // Populate edit form when user loads or editing starts
  useEffect(() => {
    if (user && isEditing) {
      setEditForm({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        heightInInches: user.heightInInches != null ? String(user.heightInInches) : '',
        birthdate: user.birthdate ?? '',
        ustaRating: user.ustaRating != null ? String(user.ustaRating) : '',
        handedness: user.handedness ?? '',
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
        ustaRating: editForm.ustaRating.trim() ? Number(editForm.ustaRating) : null,
        // The API replaces the whole profile, so the color this screen cannot
        // edit is sent back unchanged instead of being cleared.
        colorHex: user.colorHex ?? null,
      };
      // Handedness has no null form on the API, so "not set" is sent by leaving
      // the field out.
      if (editForm.handedness) dto.handedness = editForm.handedness;
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
      // Same square JPEG the account page stores, so admin uploads match.
      const photo = await normalizeAvatarImage(file);
      await uploadUserThumbnail(user.id, photo);
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
                        accept={IMAGE_ACCEPT}
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
              {canViewAs && !isEditing && (
                <button
                  className="detail-view-as-btn"
                  onClick={() => startViewAs(user.id)}
                  title="See the app as this user sees it"
                >
                  <FontAwesomeIcon icon={faEye} style={{ marginRight: 6 }} />
                  View as
                </button>
              )}
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
                              {grantableRoles.map((role) => (
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
                              {lockedRoles.map((role) => (
                                <label
                                  key={role}
                                  className="multi-select-option selected multi-select-option-locked"
                                  title={`Only a user with the ${role} role can change this role.`}
                                >
                                  <input type="checkbox" checked disabled />
                                  <span className={`role-badge ${role.toLowerCase()}`}>{role}</span>
                                </label>
                              ))}
                              {lockedRoles.length > 0 && (
                                <div className="multi-select-note">
                                  Roles above your own level are locked — only someone who holds them can
                                  change them.
                                </div>
                              )}
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
                  <DetailField
                    label="USTA Rating"
                    editing={isEditing}
                    displayValue={formatUstaRating(user.ustaRating)}
                  >
                    <StyledSelect
                      id="detail-usta-rating"
                      value={editForm.ustaRating}
                      onChange={(value) => setEditForm((f) => ({ ...f, ustaRating: value }))}
                      placeholder="Not set"
                    >
                      <option value="">Not set</option>
                      {ustaRatingOptions(
                        editForm.ustaRating.trim() ? Number(editForm.ustaRating) : null,
                      ).map((option) => (
                        <option key={option} value={String(option)}>
                          {option.toFixed(1)}
                        </option>
                      ))}
                    </StyledSelect>
                  </DetailField>
                  <DetailField
                    label="Handedness"
                    editing={isEditing}
                    displayValue={user.handedness ?? '-'}
                  >
                    <StyledSelect
                      id="detail-handedness"
                      value={editForm.handedness}
                      onChange={(value) =>
                        setEditForm((f) => ({ ...f, handedness: value as HandednessValue }))
                      }
                      placeholder="Not set"
                    >
                      <option value="">Not set</option>
                      {HANDEDNESS_VALUES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </StyledSelect>
                  </DetailField>
                </div>
              </div>

              {/* Associated Entities */}
              <div className="user-detail-section">
                <h3>Associated Entities</h3>
                {entitiesLoading ? (
                  <p className="user-detail-orgs-status">Loading entities...</p>
                ) : entitiesError ? (
                  <p className="user-detail-orgs-status error">{entitiesError}</p>
                ) : entities.length === 0 ? (
                  <p className="user-detail-orgs-status">No associated entities found.</p>
                ) : (
                  <div className="user-detail-orgs">
                    {entities.map((entity) => (
                      <OrganizationCard key={entity.id} organization={entity} />
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
