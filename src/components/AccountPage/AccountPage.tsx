import '../../styles/page.css';
import './AccountPage.css';

import {
  faBan,
  faCamera,
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faEyeDropper,
  faIdBadge,
  faPalette,
  faServer,
  faSitemap,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  deleteUserThumbnail,
  fetchCurrentUser,
  updateUser,
  uploadUserThumbnail,
  type UpdateUserDto,
  type User,
} from '../../api/api.users';
import { StyledSelect, UserAvatar } from '../common';
import { fetchAllEntities } from '../../api/api.entities';
import { fetchMetaInfo, type MetaResponse } from '../../api/api.meta';
import { isLightColor } from '../../utils/color';
import { formatBoolean, formatDate } from '../../utils/format';
import { IMAGE_ACCEPT, isImageFile, normalizeAvatarImage } from '../../utils/image';
import { getDisplayName } from '../../utils/user';
import { useAuth } from '../../contexts/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { useViewAsScope } from '../../hooks/useViewAsScope';
import {
  HANDEDNESS_VALUES,
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

/** The profile fields a user may change about themselves. */
interface IAccountForm {
  firstName: string;
  lastName: string;
  birthdate: string;
  heightInInches: string;
  ustaRating: string;
  handedness: HandednessValue;
  colorHex: string | null;
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
    (a.colorHex ?? '').toLowerCase() === (b.colorHex ?? '').toLowerCase()
  );
}

/**
 * The update payload for a whole editable profile. `roles` is deliberately
 * omitted: roles are not editable here, and an omitted field leaves the
 * account's roles untouched.
 */
function toUpdateDto(id: string, form: IAccountForm): UpdateUserDto {
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

/**
 * The organizations the user belongs to, each with the roles they hold there.
 *
 * `/entities/all` is scoped to the caller (every entity for an admin), so the
 * membership row is what proves the user belongs to that organization — it also
 * carries their roles on it, which avoids one request per organization.
 */
async function loadAccess(userId: string): Promise<IAccessEntry[]> {
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

/** 72 → "6′ 0″". */
function formatFeetInches(inches: number): string {
  const total = Math.round(inches);
  const feet = Math.floor(total / 12);
  return `${feet}′ ${total - feet * 12}″`;
}

function AccountPage() {
  const { currentUser } = useAuth();
  const viewAsScope = useViewAsScope();
  const readOnly = viewAsScope !== null;

  const initialForm = useMemo(
    () => (currentUser ? toForm(currentUser) : null),
    [currentUser],
  );

  // Null until the user edits something, so a refresh from the server flows
  // straight through to the fields.
  const [draft, setDraft] = useState<IAccountForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
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

  const userId = currentUser?.id;
  useEffect(() => {
    if (!userId) return;

    let active = true;
    setAccessLoading(true);
    setAccessError(null);
    loadAccess(userId)
      .then((rows) => {
        if (active) setAccess(rows);
      })
      .catch((error) => {
        console.error('Failed to load account access:', error);
        if (active) setAccessError('Could not load your organization access.');
      })
      .finally(() => {
        if (active) setAccessLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

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

  if (!currentUser || !form) {
    return (
      <div className="account-page">
        <div className="empty-state-large">
          <p>No account is signed in.</p>
        </div>
      </div>
    );
  }

  // Live preview: the avatar follows edits before they are saved.
  const previewUser = {
    ...currentUser,
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

  const openFilePicker = () => {
    if (!readOnly && !photoBusy) fileInputRef.current?.click();
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

      await uploadUserThumbnail(currentUser.id, photo);
      // A photo replaces the color, which then has to be picked again for the
      // ring. The rest of the profile is sent back unchanged.
      if (initialForm?.colorHex) {
        await updateUser(toUpdateDto(currentUser.id, { ...initialForm, colorHex: null }));
      }
      setDraft((current) => (current ? { ...current, colorHex: null } : current));
      await refreshSignedInUser();
      setStatus({ kind: 'success', message: 'Profile photo updated.' });
    } catch {
      setStatus({ kind: 'error', message: 'Could not update your photo. Please try again.' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoBusy(true);
    setStatus(null);
    try {
      await deleteUserThumbnail(currentUser.id);
      await refreshSignedInUser();
      setStatus({ kind: 'success', message: 'Profile photo removed.' });
    } catch {
      setStatus({ kind: 'error', message: 'Could not remove your photo. Please try again.' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    setStatus(null);
    try {
      await updateUser(toUpdateDto(currentUser.id, form));
      await refreshSignedInUser();
      setDraft(null);
      setStatus({ kind: 'success', message: 'Profile updated.' });
    } catch {
      setStatus({ kind: 'error', message: 'Could not save your profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDraft(null);
    setStatus(null);
  };

  const roles = currentUser.roles ?? [];
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
          <h2>Account</h2>

          {!readOnly && (
            <div className="account-header-actions">
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
            </div>
          )}
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
                aria-label={currentUser.thumbnailUrl ? 'Replace profile photo' : 'Upload profile photo'}
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
            <span className="account-email">{currentUser.email ?? 'No email on file'}</span>
            {roles.length > 0 && (
              <div className="account-roles">
                {roles.map((role) => (
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
                  {currentUser.thumbnailUrl ? 'Replace photo' : 'Upload photo'}
                </button>
                {currentUser.thumbnailUrl && (
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
              <span className="account-hint">Any image &middot; squared and resized &middot; up to 20 MB</span>
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
            {readOnly && <span className="account-unsaved">Read-only while viewing as</span>}
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
                    {formatFeetInches(inches)}
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
              <div className="account-fact">
                <dt>Sign-in</dt>
                <dd>Email magic link</dd>
              </div>
              <div className="account-fact">
                <dt>Email verified</dt>
                <dd>{formatBoolean(currentUser.isEmailVerified)}</dd>
              </div>
              <div className="account-fact">
                <dt>Terms accepted</dt>
                <dd>{formatBoolean(currentUser.acceptedTerms)}</dd>
              </div>
              <div className="account-fact">
                <dt>Member since</dt>
                <dd>{formatDate(currentUser.createdAt)}</dd>
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
              <p className="account-access-status">Loading your access&hellip;</p>
            ) : accessError ? (
              <p className="account-access-status error">{accessError}</p>
            ) : !access || access.length === 0 ? (
              <p className="account-access-status">
                You are not a member of any organization yet.
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

            <p className="account-note">
              <FontAwesomeIcon icon={faCircleInfo} />
              <span>
                Your email address, roles and organization access are managed by your
                organization&apos;s administrators.
              </span>
            </p>
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
