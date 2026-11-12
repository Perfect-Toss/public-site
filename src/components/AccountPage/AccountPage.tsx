import '../../styles/page.css';
import './AccountPage.css';

import {
  faArrowLeft,
  faBan,
  faCamera,
  faChevronDown,
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faEye,
  faEyeDropper,
  faIdBadge,
  faPalette,
  faServer,
  faSitemap,
  faUser,
  faUserShield,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  deleteUserThumbnail,
  fetchCurrentUser,
  fetchUserById,
  isAdminUser,
  updateUser,
  uploadUserThumbnail,
  type UpdateUserDto,
  type User,
} from '../../api/api.users';
import { StyledSelect, UserAvatar } from '../common';
import {
  fetchAllEntities,
  fetchUserMemberships,
  type UserMembership,
} from '../../api/api.entities';
import { fetchMetaInfo, type MetaResponse } from '../../api/api.meta';
import { Role, assignableRoles, canAssignRole } from '../../utils/roles';
import { isLightColor } from '../../utils/color';
import { formatBoolean, formatDate } from '../../utils/format';
import { IMAGE_ACCEPT, isImageFile, normalizeAvatarImage } from '../../utils/image';
import { getDisplayName } from '../../utils/user';
import { useAuth } from '../../contexts/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { startViewAs, useViewAsTarget } from '../../stores/viewAsStore';
import {
  HANDEDNESS_VALUES,
  formatHeight,
  ustaRatingOptions,
  type HandednessValue,
} from '../../utils/profile';
import { APP_VERSION, IS_PRODUCTION, formatVersion } from '../../version';

/** Avatar colors offered on the account page. */
const AVATAR_COLORS: ReadonlyArray<{ hex: string; name: string }> = [
  { hex: '#CFFF04', name: 'Lime' },
  { hex: '#F5B323', name: 'Amber' },
  { hex: '#F2762E', name: 'Orange' },
  { hex: '#E05353', name: 'Red' },
  { hex: '#E36BA8', name: 'Pink' },
  { hex: '#9B6BE3', name: 'Purple' },
  { hex: '#5B6BE0', name: 'Indigo' },
  { hex: '#3B8CE0', name: 'Blue' },
  { hex: '#35B9A8', name: 'Teal' },
  { hex: '#4CAF6A', name: 'Green' },
  { hex: '#7A8698', name: 'Slate' },
  { hex: '#A8815B', name: 'Bronze' },
];

const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

/** Avatar diameter — keep in sync with `.account-avatar` in AccountPage.css. */
const AVATAR_SIZE = 88;

/** Fallback for the custom color input, which requires a valid hex value. */
const DEFAULT_AVATAR_COLOR = '#CFFF04';

/** How long a success message stays on screen. */
const STATUS_TIMEOUT_MS = 4000;

/** Heights the picker offers, in inches: 2′0″ to 8′0″. */
const HEIGHT_CHOICES = Array.from({ length: 73 }, (_, index) => index + 24);

/** The profile fields an account's owner or an admin may change. */
interface IAccountForm {
  firstName: string;
  lastName: string;
  birthdate: string;
  heightInInches: string;
  ustaRating: string;
  handedness: HandednessValue;
  colorHex: string | null;
  roles: Role[];
}

function toForm(user: User): IAccountForm {
  return {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    birthdate: user.birthdate ?? '',
    heightInInches: user.heightInInches != null ? String(user.heightInInches) : '',
    ustaRating: user.ustaRating != null ? String(user.ustaRating) : '',
    handedness: user.handedness ?? '',
    colorHex: user.colorHex ?? null,
    roles: [...((user.roles ?? []) as Role[])],
  };
}

function formsMatch(a: IAccountForm, b: IAccountForm): boolean {
  return (
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.birthdate === b.birthdate &&
    a.heightInInches === b.heightInInches &&
    a.ustaRating === b.ustaRating &&
    a.handedness === b.handedness &&
    (a.colorHex ?? '').toLowerCase() === (b.colorHex ?? '').toLowerCase() &&
    a.roles.length === b.roles.length &&
    a.roles.every((role) => b.roles.includes(role))
  );
}

/**
 * The update payload for a whole editable profile.
 *
 * `roles` is only sent by an admin editing someone else. A self-service save
 * omits it, and an omitted field leaves the account's roles untouched (sending
 * `null` would clear them).
 */
function toUpdateDto(id: string, form: IAccountForm, includeRoles: boolean): UpdateUserDto {
  const dto: UpdateUserDto = {
    id,
    firstName: form.firstName.trim() || null,
    lastName: form.lastName.trim() || null,
    birthdate: form.birthdate.trim() || null,
    heightInInches: form.heightInInches.trim() ? Number(form.heightInInches) : null,
    ustaRating: form.ustaRating.trim() ? Number(form.ustaRating) : null,
    colorHex: form.colorHex,
  };
  // The API takes no null for the handedness enum, so "Not set" is sent by
  // leaving the field out.
  if (form.handedness) dto.handedness = form.handedness;
  if (includeRoles) dto.roles = form.roles.length > 0 ? form.roles : null;
  return dto;
}

/** One organization the user belongs to, with the roles they hold on it. */
interface IAccessEntry {
  id: string;
  name: string;
  entityType: string | null;
  roles: string[];
}

/** Re-reads the signed-in profile so the app shell picks up name/photo changes. */
async function refreshSignedInUser(): Promise<void> {
  const fresh = await fetchCurrentUser();
  if (fresh) useAuthStore.getState().setAuth(useAuthStore.getState().firebaseUser, fresh);
}

/** A membership the server named an entity for. */
type NamedMembership = UserMembership & { entityId: string };

/**
 * The organizations the user belongs to, each with the roles they hold there.
 *
 * An admin reads the account's own memberships, which carry the roles the
 * account holds on each organization. Anyone else falls back to the
 * caller-scoped entity list, whose membership row proves the organization and
 * carries its roles too.
 */
async function loadAccess(
  userId: string,
  canReadMemberships: boolean,
): Promise<IAccessEntry[]> {
  if (canReadMemberships) {
    const memberships = await fetchUserMemberships(userId);

    return memberships
      .filter((membership): membership is NamedMembership => Boolean(membership.entityId))
      .map((membership) => ({
        id: membership.entityId,
        name: membership.entityName ?? 'Untitled organization',
        entityType: membership.entityType ?? null,
        roles: membership.roles ?? [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const entities = await fetchAllEntities(true);

  return entities
    .map((entity): IAccessEntry | null => {
      const membership = entity.users?.find((member) => member.user.id === userId);
      if (!membership) return null;

      return {
        id: entity.id,
        name: entity.name ?? 'Untitled organization',
        entityType: entity.entityType ?? null,
        roles: membership.roles ?? [],
      };
    })
    .filter((entry): entry is IAccessEntry => entry !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * One account, as its owner sees it and as an admin edits it.
 *
 * `/account` renders the signed-in account; `/admin/users/:id` renders the
 * account the route names and adds the role editor, "view as" and a way back to
 * the user list. Both write through the same form, so there is one edit screen.
 */
function AccountPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isAdminRoute = Boolean(id);

  const { currentUser } = useAuth();
  const signedInUser = useAuthStore((state) => state.user);
  const readOnly = useViewAsTarget() !== null;

  // The account this route names; `/account` reads it from the auth context.
  const [loaded, setLoaded] = useState<User | null>(null);
  const [loading, setLoading] = useState(isAdminRoute);
  const [loadError, setLoadError] = useState<string | null>(null);

  const user = isAdminRoute ? loaded : currentUser;

  const initialForm = useMemo(() => (user ? toForm(user) : null), [user]);

  // Null until the user edits something, so a refresh from the server flows
  // straight through to the fields.
  const [draft, setDraft] = useState<IAccountForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [access, setAccess] = useState<IAccessEntry[] | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [metaError, setMetaError] = useState(false);

  const form = draft ?? initialForm;
  const dirty = Boolean(draft && initialForm && !formsMatch(draft, initialForm));

  // A confirmation clears itself; an error stays until it is dismissed or the
  // next action replaces it.
  useEffect(() => {
    if (status?.kind !== 'success') return;
    const timer = window.setTimeout(() => setStatus(null), STATUS_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  // Loads the account the route names. `/account` needs nothing here: the auth
  // context already holds the signed-in profile.
  useEffect(() => {
    setDraft(null);
    setRolePickerOpen(false);
    setStatus(null);

    if (!id) {
      setLoaded(null);
      setLoadError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);
    fetchUserById(id)
      .then((fresh) => {
        if (!active) return;
        setLoaded(fresh);
        if (!fresh) setLoadError('This account could not be found.');
      })
      .catch((error) => {
        console.error('Failed to load account:', error);
        if (active) setLoadError('Could not load this account.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const userId = user?.id;
  /** Memberships are an admin-only read, whatever account is on screen. */
  const canReadMemberships = isAdminUser(signedInUser);
  useEffect(() => {
    if (!userId) return;

    let active = true;
    setAccessLoading(true);
    setAccessError(null);
    loadAccess(userId, canReadMemberships)
      .then((rows) => {
        if (active) setAccess(rows);
      })
      .catch((error) => {
        console.error('Failed to load account access:', error);
        if (active) setAccessError('Could not load organization access.');
      })
      .finally(() => {
        if (active) setAccessLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, canReadMemberships]);

  // The API reports its own build, which is the only way to tell a stale API
  // from a stale site.
  useEffect(() => {
    let active = true;
    fetchMetaInfo()
      .then((info) => {
        if (active) setMeta(info);
      })
      .catch((error) => {
        console.error('Failed to load API meta info:', error);
        if (active) setMetaError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="account-page">
        <div className="account-loading">
          <span className="account-spinner" aria-hidden="true" />
          <p>Loading account&hellip;</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="account-page">
        <div className="account-error">
          <h3>{loadError}</h3>
          <button type="button" className="secondary-btn" onClick={() => navigate('/admin/users')}>
            <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> Back to users
          </button>
        </div>
      </div>
    );
  }

  if (!user || !form) {
    return (
      <div className="account-page">
        <div className="empty-state-large">
          <p>No account is signed in.</p>
        </div>
      </div>
    );
  }

  /** Roles are granted on the admin route only — never by the account's owner. */
  const canEditRoles = isAdminRoute && !readOnly;
  const grantableRoles = canEditRoles ? assignableRoles(signedInUser?.roles) : [];
  /**
   * Roles the account holds that the acting user may not grant. They stay on the
   * account and render locked, so a lower admin can neither add nor strip them.
   */
  const lockedRoles = canEditRoles
    ? form.roles.filter((role) => !canAssignRole(signedInUser?.roles, role))
    : [];

  /** Only an admin may emulate, and only while not already emulating. */
  const canViewAs =
    isAdminRoute && !readOnly && isAdminUser(signedInUser) && signedInUser?.id !== user.id;

  // Live preview: the avatar follows edits before they are saved.
  const previewUser = {
    ...user,
    firstName: form.firstName.trim() || null,
    lastName: form.lastName.trim() || null,
    colorHex: form.colorHex,
  };

  const heightInches = Number(form.heightInInches);
  const heightIsSet = form.heightInInches.trim() !== '' && Number.isFinite(heightInches);
  const heightCm = heightIsSet ? Math.round(heightInches * 2.54) : null;
  // A height stored outside the offered range still has to be selectable.
  const heightChoices =
    heightIsSet && !HEIGHT_CHOICES.includes(heightInches)
      ? [...HEIGHT_CHOICES, heightInches].sort((a, b) => a - b)
      : HEIGHT_CHOICES;

  const rating = Number(form.ustaRating);
  // A rating stored off the half-step grid stays selectable.
  const ratingChoices = ustaRatingOptions(form.ustaRating.trim() ? rating : null);

  const updateField = <K extends keyof IAccountForm>(key: K, value: IAccountForm[K]) => {
    setDraft({ ...form, [key]: value });
    setStatus(null);
  };

  const toggleRole = (role: Role) => {
    updateField(
      'roles',
      form.roles.includes(role)
        ? form.roles.filter((held) => held !== role)
        : [...form.roles, role],
    );
  };

  const openFilePicker = () => {
    if (!readOnly && !photoBusy) fileInputRef.current?.click();
  };

  /** Re-reads the account after a write whose result this form does not keep. */
  const refreshUser = async () => {
    if (isAdminRoute) {
      const fresh = await fetchUserById(user.id);
      if (fresh) setLoaded(fresh);
      return;
    }
    await refreshSignedInUser();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the input so picking the same file twice still fires a change.
    event.target.value = '';
    if (!file) return;

    if (!isImageFile(file)) {
      setStatus({ kind: 'error', message: 'Please choose an image file.' });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setStatus({ kind: 'error', message: 'That image is larger than 20 MB.' });
      return;
    }

    setPhotoBusy(true);
    setStatus(null);
    try {
      // Squared and shrunk here, so a phone photo of any format becomes a JPEG
      // every browser can show.
      let photo: File;
      try {
        photo = await normalizeAvatarImage(file);
      } catch {
        setStatus({ kind: 'error', message: 'Could not read that image. Try JPG, PNG or WebP.' });
        return;
      }

      await uploadUserThumbnail(user.id, photo);
      // A photo replaces the color, which then has to be picked again for the
      // ring. The rest of the profile is sent back unchanged.
      if (initialForm?.colorHex) {
        const updated = await updateUser(
          toUpdateDto(user.id, { ...initialForm, colorHex: null }, canEditRoles),
        );
        if (isAdminRoute && updated) setLoaded(updated);
      }
      setDraft((current) => (current ? { ...current, colorHex: null } : current));
      await refreshUser();
      setStatus({ kind: 'success', message: 'Profile photo updated.' });
    } catch {
      setStatus({ kind: 'error', message: 'Could not update the photo. Please try again.' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoBusy(true);
    setStatus(null);
    try {
      await deleteUserThumbnail(user.id);
      await refreshUser();
      setStatus({ kind: 'success', message: 'Profile photo removed.' });
    } catch {
      setStatus({ kind: 'error', message: 'Could not remove the photo. Please try again.' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    setStatus(null);
    try {
      const updated = await updateUser(toUpdateDto(user.id, form, canEditRoles));
      if (isAdminRoute) {
        if (updated) setLoaded(updated);
        else await refreshUser();
      } else {
        await refreshSignedInUser();
      }
      setDraft(null);
      setRolePickerOpen(false);
      setStatus({ kind: 'success', message: 'Profile updated.' });
    } catch {
      setStatus({ kind: 'error', message: 'Could not save the profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDraft(null);
    setRolePickerOpen(false);
    setStatus(null);
  };

  const today = new Date().toISOString().slice(0, 10);
  const isPresetColor = AVATAR_COLORS.some(
    ({ hex }) => hex.toLowerCase() === (form.colorHex ?? '').toLowerCase(),
  );
  const customColorActive = Boolean(form.colorHex) && !isPresetColor;
  const apiVersion = meta?.version ?? (metaError ? 'Unavailable' : 'Checking\u2026');

  return (
    <div className="account-page">
      <section className="section">
        <div className="section-header">
          <div className="account-header-title">
            {isAdminRoute && (
              <button
                type="button"
                className="account-back"
                onClick={() => navigate('/admin/users')}
                title="Back to users"
                aria-label="Back to users"
              >
                <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
              </button>
            )}
            <h2>Account</h2>
          </div>

          <div className="account-header-actions">
            {readOnly ? (
              <span className="account-unsaved">Read-only while viewing as</span>
            ) : (
              <>
                {canViewAs && (
                  <button
                    type="button"
                    className="account-view-as"
                    onClick={() => startViewAs(user.id)}
                    title="See the app as this user sees it"
                  >
                    <FontAwesomeIcon icon={faEye} aria-hidden="true" />
                    View as
                  </button>
                )}
                {dirty && <span className="account-unsaved">Unsaved changes</span>}
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={discard}
                  disabled={!dirty || saving}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleSave}
                  disabled={!dirty || saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="account-layout">
          {/* Identity */}
          <section className="account-hero">
            <div className="account-avatar">
              <UserAvatar user={previewUser} size={AVATAR_SIZE} />
              {!readOnly && (
                <button
                  type="button"
                  className="account-avatar-btn"
                  onClick={openFilePicker}
                  disabled={photoBusy}
                  aria-label={user.thumbnailUrl ? 'Replace profile photo' : 'Upload profile photo'}
                  title="Change photo"
                >
                  <FontAwesomeIcon icon={faCamera} />
                </button>
              )}
              {photoBusy && (
                <span className="account-avatar-busy">
                  <span className="account-spinner" />
                </span>
              )}
            </div>

            <div className="account-identity">
              <h3 className="account-name">{getDisplayName(previewUser)}</h3>
              <span className="account-email">{user.email ?? 'No email on file'}</span>
              {form.roles.length > 0 && (
                <div className="account-roles">
                  {form.roles.map((role) => (
                    <span key={role} className="account-role">
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {!readOnly && (
              <div className="account-photo-actions">
                <div className="account-photo-buttons">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={openFilePicker}
                    disabled={photoBusy}
                  >
                    {user.thumbnailUrl ? 'Replace photo' : 'Upload photo'}
                  </button>
                  {user.thumbnailUrl && (
                    <button
                      type="button"
                      className="account-photo-remove"
                      onClick={handleRemovePhoto}
                      disabled={photoBusy}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
                <span className="account-hint">
                  Any image &middot; squared and resized &middot; up to 20 MB
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              className="account-file-input"
              onChange={handleFileChange}
            />
          </section>

          {/* Profile */}
          <section className="info-card account-card">
            <div className="info-card-header">
              <span className="info-card-title">
                <FontAwesomeIcon icon={faUser} /> Profile
              </span>
            </div>

            <div className="account-fields">
              <div className="account-field">
                <label htmlFor="account-first-name">First name</label>
                <input
                  id="account-first-name"
                  type="text"
                  value={form.firstName}
                  onChange={(event) => updateField('firstName', event.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  disabled={readOnly}
                />
              </div>

              <div className="account-field">
                <label htmlFor="account-last-name">Last name</label>
                <input
                  id="account-last-name"
                  type="text"
                  value={form.lastName}
                  onChange={(event) => updateField('lastName', event.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  disabled={readOnly}
                />
              </div>

              <div className="account-field">
                <label htmlFor="account-birthdate">Date of birth</label>
                <input
                  id="account-birthdate"
                  type="date"
                  value={form.birthdate}
                  onChange={(event) => updateField('birthdate', event.target.value)}
                  max={today}
                  autoComplete="bday"
                  disabled={readOnly}
                />
              </div>

              <div className="account-field">
                <div className="account-field-head">
                  <label htmlFor="account-height">Height</label>
                  {heightCm !== null && <small>{heightCm} cm</small>}
                </div>
                <StyledSelect
                  id="account-height"
                  value={form.heightInInches}
                  onChange={(value) => updateField('heightInInches', value)}
                  disabled={readOnly}
                  placeholder="Not set"
                >
                  <option value="">Not set</option>
                  {heightChoices.map((inches) => (
                    <option key={inches} value={String(inches)}>
                      {formatHeight(inches)}
                    </option>
                  ))}
                </StyledSelect>
              </div>

              <div className="account-field">
                <div className="account-field-head">
                  <label htmlFor="account-usta-rating">USTA rating</label>
                  <small>NTRP 1.0&ndash;7.0</small>
                </div>
                <StyledSelect
                  id="account-usta-rating"
                  value={form.ustaRating}
                  onChange={(value) => updateField('ustaRating', value)}
                  disabled={readOnly}
                  placeholder="Not set"
                >
                  <option value="">Not set</option>
                  {ratingChoices.map((option) => (
                    <option key={option} value={String(option)}>
                      {option.toFixed(1)}
                    </option>
                  ))}
                </StyledSelect>
              </div>

              <div className="account-field">
                <label htmlFor="account-handedness">Handedness</label>
                <StyledSelect
                  id="account-handedness"
                  value={form.handedness}
                  onChange={(value) => updateField('handedness', value as HandednessValue)}
                  disabled={readOnly}
                  placeholder="Not set"
                >
                  <option value="">Not set</option>
                  {HANDEDNESS_VALUES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </StyledSelect>
              </div>
            </div>

            {canEditRoles && (
              <div className="account-section">
                <div className="account-section-head">
                  <span className="account-section-title">
                    <FontAwesomeIcon icon={faUserShield} /> Roles
                  </span>
                  <small>{form.roles.length} selected</small>
                </div>

                <div className="multi-select-wrapper">
                  <button
                    type="button"
                    className="multi-select-trigger"
                    onClick={() => setRolePickerOpen((open) => !open)}
                    aria-expanded={rolePickerOpen}
                    aria-haspopup="true"
                    disabled={saving}
                  >
                    <span className="multi-select-tags">
                      {form.roles.length === 0 ? (
                        <span className="multi-select-placeholder">Select roles...</span>
                      ) : (
                        form.roles.map((role) => (
                          <span key={role} className="account-role">
                            {role}
                          </span>
                        ))
                      )}
                    </span>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`multi-select-chevron${rolePickerOpen ? ' open' : ''}`}
                      aria-hidden="true"
                    />
                  </button>

                  {rolePickerOpen && (
                    <>
                      <div
                        className="multi-select-backdrop"
                        onClick={() => setRolePickerOpen(false)}
                      />
                      <div className="multi-select-dropdown" role="group" aria-label="Roles">
                        {grantableRoles.map((role) => (
                          <label
                            key={role}
                            className={`multi-select-option${
                              form.roles.includes(role) ? ' selected' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={form.roles.includes(role)}
                              onChange={() => toggleRole(role)}
                            />
                            <span className="account-role">{role}</span>
                          </label>
                        ))}
                        {lockedRoles.map((role) => (
                          <label
                            key={role}
                            className="multi-select-option selected multi-select-option-locked"
                            title={`Only a user with the ${role} role can change this role.`}
                          >
                            <input type="checkbox" checked disabled />
                            <span className="account-role">{role}</span>
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

                <span className="account-hint">
                  Roles govern app-wide permissions. Roles on an organization are set on that
                  organization&apos;s Members and Settings tabs.
                </span>
              </div>
            )}

            <div className="account-section">
              <div className="account-section-head">
                <span className="account-section-title">
                  <FontAwesomeIcon icon={faPalette} /> Avatar color
                </span>
                {/* Always rendered, hidden until there is a color to clear, so the
                    section head never changes height. */}
                {!readOnly && (
                  <button
                    type="button"
                    className="account-clear-color"
                    onClick={() => updateField('colorHex', null)}
                    disabled={!form.colorHex}
                  >
                    <FontAwesomeIcon icon={faBan} aria-hidden="true" />
                    Clear color
                  </button>
                )}
              </div>

              <div className="account-swatches" role="group" aria-label="Avatar color">
                {AVATAR_COLORS.map(({ hex, name }) => {
                  const selected = (form.colorHex ?? '').toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      className={`account-swatch${selected ? ' selected' : ''}`}
                      style={{ background: hex }}
                      aria-label={name}
                      aria-pressed={selected}
                      title={name}
                      disabled={readOnly}
                      onClick={() => updateField('colorHex', hex)}
                    />
                  );
                })}

                <label
                  className={`account-swatch account-swatch-custom${
                    customColorActive ? ' selected' : ''
                  }`}
                  style={
                    customColorActive
                      ? {
                          background: form.colorHex ?? DEFAULT_AVATAR_COLOR,
                          color: isLightColor(form.colorHex ?? DEFAULT_AVATAR_COLOR)
                            ? '#1a1f24'
                            : '#fff',
                        }
                      : undefined
                  }
                  title="Custom color"
                >
                  <input
                    type="color"
                    className="account-color-input"
                    value={form.colorHex ?? DEFAULT_AVATAR_COLOR}
                    onChange={(event) => updateField('colorHex', event.target.value)}
                    aria-label="Custom avatar color"
                    disabled={readOnly}
                  />
                  <FontAwesomeIcon icon={faEyeDropper} aria-hidden="true" />
                </label>
              </div>

              {!form.colorHex && (
                <span className="account-hint">
                  Automatic &mdash; a color derived from your name.
                </span>
              )}
              {form.colorHex && (
                <span className="account-hint">
                  Drawn as a ring around your avatar.
                  {customColorActive && ` Custom ${form.colorHex}.`}
                </span>
              )}
            </div>
          </section>

          <div className="account-side">
            {/* Account (read-only) */}
            <section className="info-card account-card">
              <div className="info-card-header">
                <span className="info-card-title">
                  <FontAwesomeIcon icon={faIdBadge} /> Account
                </span>
              </div>

              <dl className="account-facts">
                {!isAdminRoute && (
                  <div className="account-fact">
                    <dt>Sign-in</dt>
                    <dd>Email magic link</dd>
                  </div>
                )}
                <div className="account-fact">
                  <dt>Status</dt>
                  <dd
                    className={`account-status-value${
                      user.isDeleted ? ' inactive' : user.isEmailVerified ? ' active' : ' pending'
                    }`}
                  >
                    {user.isDeleted ? 'Inactive' : user.isEmailVerified ? 'Verified' : 'Pending'}
                  </dd>
                </div>
                <div className="account-fact">
                  <dt>Email verified</dt>
                  <dd>{formatBoolean(user.isEmailVerified)}</dd>
                </div>
                <div className="account-fact">
                  <dt>Terms accepted</dt>
                  <dd>{formatBoolean(user.acceptedTerms)}</dd>
                </div>
                <div className="account-fact">
                  <dt>Member since</dt>
                  <dd>{formatDate(user.createdAt)}</dd>
                </div>
                <div className="account-fact">
                  <dt>Last modified</dt>
                  <dd>{formatDate(user.lastModifiedAt)}</dd>
                </div>
              </dl>
            </section>

            {/* Access */}
            <section className="info-card account-card">
              <div className="info-card-header">
                <span className="info-card-title">
                  <FontAwesomeIcon icon={faSitemap} /> Access
                </span>
                {access && access.length > 0 && (
                  <span className="account-access-count">
                    {access.length} {access.length === 1 ? 'organization' : 'organizations'}
                  </span>
                )}
              </div>

              {accessLoading ? (
                <p className="account-access-status">Loading access&hellip;</p>
              ) : accessError ? (
                <p className="account-access-status error">{accessError}</p>
              ) : !access || access.length === 0 ? (
                <p className="account-access-status">
                  {isAdminRoute
                    ? 'This account is not a member of any organization yet.'
                    : 'You are not a member of any organization yet.'}
                </p>
              ) : (
                <ul className="account-access-list">
                  {access.map((entry) => (
                    <li key={entry.id} className="account-access-row">
                      <div className="account-access-org">
                        <Link
                          className="account-access-name"
                          to={`/organizations/${entry.id}`}
                          title={entry.name}
                        >
                          {entry.name}
                        </Link>
                        {entry.entityType && (
                          <span className="account-access-type">{entry.entityType}</span>
                        )}
                      </div>
                      <div className="account-access-roles">
                        {entry.roles.length > 0 ? (
                          entry.roles.map((role) => (
                            <span key={role} className="account-role">
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="account-access-none">No role</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {isAdminRoute ? (
                <p className="account-note">
                  <FontAwesomeIcon icon={faCircleInfo} />
                  <span>
                    Organization access is managed on each organization&apos;s Members and
                    Settings tabs.
                  </span>
                </p>
              ) : (
                <p className="account-note">
                  <FontAwesomeIcon icon={faCircleInfo} />
                  <span>
                    Your email address, roles and organization access are managed by your
                    organization&apos;s administrators.
                  </span>
                </p>
              )}
            </section>

            {/* System */}
            <section className="info-card account-card">
              <div className="info-card-header">
                <span className="info-card-title">
                  <FontAwesomeIcon icon={faServer} /> System
                </span>
              </div>

              <dl className="account-facts">
                <div className="account-fact">
                  <dt>Site version</dt>
                  <dd
                    title={
                      IS_PRODUCTION
                        ? undefined
                        : `Built ${new Date(APP_VERSION.buildTime).toLocaleString()}`
                    }
                  >
                    {formatVersion()}
                  </dd>
                </div>
                <div className="account-fact">
                  <dt>API version</dt>
                  <dd>{apiVersion}</dd>
                </div>
                <div className="account-fact">
                  <dt>User ID</dt>
                  <dd className="account-fact-mono">{user.id}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </section>

      {status && (
        <div className={`account-status ${status.kind}`} role="status">
          <FontAwesomeIcon
            icon={status.kind === 'success' ? faCircleCheck : faCircleExclamation}
            aria-hidden="true"
          />
          <span className="account-status-text">{status.message}</span>
          <button
            type="button"
            className="account-status-dismiss"
            onClick={() => setStatus(null)}
            aria-label="Dismiss"
          >
            <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountPage;
