import '../../styles/page.css';
import './VideoDetailPage.css';

import {
  faArrowLeft,
  faBuilding,
  faChevronDown,
  faChevronUp,
  faShareNodes,
  faSpinner,
  faTimes,
  faTrash,
  faUser,
  faVideo,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  deleteVideo,
  fetchVideoById,
  fetchVideoEntities,
  fetchVideoUsers,
  removeVideoEntityAccess,
  removeVideoUserAccess,
  requestDownloadToken,
  shareVideo,
  type DeviceOrientation,
  type ReviewStatus,
  type UploadStatus,
  type Video,
  type VideoAccessLevel,
  type VideoEntityAccessResult,
  type VideoUserAccessResult,
} from '../../api/api.videos';
import { fetchAllEntities, type Entity } from '../../api/api.entities';
import { fetchAllUsers, type User } from '../../api/api.users';
import { getDisplayName } from '../../utils/user';
import { MetadataItem, StyledSelect, UserAvatar, UserInfo, VirtualizedSelect } from '../common';
import {
  formatAspectRatio,
  formatBoolean,
  formatBytes,
  formatDateTime,
  formatDuration,
  formatEnum,
} from '../../utils/format';
import {
  formatEntityNames,
  formatTagNames,
  formatUserNames,
} from '../../utils/videos';

const ACCESS_LEVEL_LABELS: Record<VideoAccessLevel, string> = {
  ReadOnly: 'Read only',
  Review: 'Review',
  Edit: 'Edit',
};

const DEVICE_ORIENTATION_LABELS: Record<DeviceOrientation, string> = {
  Unknown: 'Unknown',
  Portrait: 'Portrait',
  Landscape: 'Landscape',
  PortraitUpsideDown: 'Portrait (upside down)',
  LandscapeLeft: 'Landscape (left)',
  LandscapeRight: 'Landscape (right)',
};

const UPLOAD_STATUS_LABELS: Record<UploadStatus, string> = {
  Unknown: 'Unknown',
  NotUploaded: 'Not uploaded',
  Pending: 'Pending',
  Uploaded: 'Uploaded',
};

const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  Unknown: 'Unknown',
  NotReviewed: 'Not reviewed',
  ReviewRequested: 'Review requested',
  Reviewed: 'Reviewed',
};

function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // The video response already embeds the user info for audit fields.
  const renderUserRef = (user?: Video['createdByUser']) =>
    user ? <UserInfo user={user} size={24} /> : '—';

  const [video, setVideo] = useState<Video | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // ── Access & sharing state ─────────────────────────────────────
  const [accessUsers, setAccessUsers] = useState<VideoUserAccessResult[]>([]);
  const [accessEntities, setAccessEntities] = useState<VideoEntityAccessResult[]>([]);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<'user' | 'entity'>('user');
  const [shareUserId, setShareUserId] = useState('');
  const [shareEntityId, setShareEntityId] = useState('');
  const [shareLevel, setShareLevel] = useState<VideoAccessLevel>('ReadOnly');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [metadataExpanded, setMetadataExpanded] = useState(false);

  const loadVideo = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const videoData = await fetchVideoById(id);
      if (!videoData) {
        setError('Video not found.');
        return;
      }
      setVideo(videoData);
    } catch (err) {
      console.error('Failed to load video:', err);
      setError('Failed to load video. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadDownloadToken = useCallback(async () => {
    if (!id) return;
    setTokenLoading(true);
    setTokenError(null);
    setVideoUrl(null);
    try {
      const token = await requestDownloadToken(id);
      if (token?.sasUrl) {
        setVideoUrl(token.sasUrl);
      } else {
        setTokenError('Could not generate a playback link.');
      }
    } catch (err) {
      console.error('Failed to load download token:', err);
      setTokenError('Could not generate a playback link.');
    } finally {
      setTokenLoading(false);
    }
  }, [id]);

  const loadAccess = useCallback(async () => {
    if (!id) return;
    setAccessLoading(true);
    setAccessError(null);
    try {
      const [users, entities] = await Promise.all([
        fetchVideoUsers(id),
        fetchVideoEntities(id),
      ]);
      setAccessUsers(users);
      setAccessEntities(entities);
    } catch (err) {
      console.error('Failed to load video access:', err);
      setAccessError('Could not load access information.');
    } finally {
      setAccessLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadVideo();
  }, [loadVideo]);

  useEffect(() => {
    loadDownloadToken();
  }, [loadDownloadToken]);

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);

  const openShareModal = useCallback(async () => {
    setShareOpen(true);
    setShareError(null);
    if (allUsers.length === 0) {
      try {
        setAllUsers(await fetchAllUsers());
      } catch (err) {
        console.error('Failed to load users for sharing:', err);
      }
    }
    if (allEntities.length === 0) {
      try {
        setAllEntities(await fetchAllEntities());
      } catch (err) {
        console.error('Failed to load entities for sharing:', err);
      }
    }
  }, [allUsers.length, allEntities.length]);

  const handleRemoveUserAccess = useCallback(
    async (userId: string) => {
      if (!id) return;
      try {
        await removeVideoUserAccess(id, userId);
        setAccessUsers((prev) => prev.filter((a) => a.user.id !== userId));
      } catch (err) {
        console.error('Failed to remove user access:', err);
      }
    },
    [id],
  );

  const handleRemoveEntityAccess = useCallback(
    async (entityId: string) => {
      if (!id) return;
      try {
        await removeVideoEntityAccess(id, entityId);
        setAccessEntities((prev) => prev.filter((a) => a.entity.id !== entityId));
      } catch (err) {
        console.error('Failed to remove entity access:', err);
      }
    },
    [id],
  );

  const handleShare = useCallback(async () => {
    if (!id) return;
    setShareSubmitting(true);
    setShareError(null);
    try {
      if (shareTarget === 'user') {
        if (!shareUserId) {
          setShareError('Select a user to share with.');
          return;
        }
        await shareVideo(id, { userId: shareUserId, accessLevel: shareLevel });
      } else {
        if (!shareEntityId) {
          setShareError('Select an entity to share with.');
          return;
        }
        await shareVideo(id, { entityId: shareEntityId, accessLevel: shareLevel });
      }
      setShareOpen(false);
      setShareUserId('');
      setShareEntityId('');
      await loadAccess();
    } catch (err) {
      console.error('Failed to share video:', err);
      setShareError('Failed to share video. Please try again.');
    } finally {
      setShareSubmitting(false);
    }
  }, [id, shareTarget, shareUserId, shareEntityId, shareLevel, loadAccess]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteVideo(id);
      navigate('/videos');
    } catch (err) {
      console.error('Failed to delete video:', err);
      setDeleteError('Failed to delete video. Please try again.');
      setDeleteSubmitting(false);
    }
  }, [id, navigate]);

  // Users/entities not already granted access, for the share picker.
  const shareableUsers = allUsers.filter((u) => !accessUsers.some((a) => a.user.id === u.id));
  const shareableEntities = allEntities.filter((e) => !accessEntities.some((a) => a.entity.id === e.id));

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading video...</p>
        </div>
      );
    }

    if (error && !video) {
      return (
        <div className="error-container">
          <p>{error}</p>
          <button className="retry-button" onClick={loadVideo}>
            Retry
          </button>
        </div>
      );
    }

    if (!video) return null;

    const poster = video.thumbnailUrl ?? undefined;
    const notUploaded = video.uploadStatus === 'NotUploaded' || video.uploadStatus === 'Pending';

    return (
      <>
        <div className="video-detail-header">
          <button className="back-button" onClick={() => navigate('/videos')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to videos</span>
          </button>

          <div className="video-detail-actions">
            <button className="secondary-btn" onClick={openShareModal}>
              <FontAwesomeIcon icon={faShareNodes} />
              <span>Share</span>
            </button>
            <button className="delete-btn" onClick={() => setDeleteConfirmOpen(true)}>
              <FontAwesomeIcon icon={faTrash} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        <div className="video-detail-player">
          {videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              poster={poster}
              className="video-detail-video"
            />
          ) : notUploaded ? (
            <div className="video-detail-unavailable">
              <FontAwesomeIcon icon={faVideo} size="3x" style={{ opacity: 0.3 }} />
              <h3>Video not uploaded yet</h3>
              <p>This video is marked as {video.uploadStatus?.toLowerCase() ?? 'not uploaded'}. Its file is not available for playback.</p>
            </div>
          ) : tokenLoading ? (
            <div className="video-detail-unavailable">
              <div className="spinner" />
              <h3>Loading playback link...</h3>
              <p>Generating a secure playback link for this video.</p>
            </div>
          ) : (
            <div className="video-detail-unavailable">
              <FontAwesomeIcon icon={faVideo} size="3x" style={{ opacity: 0.3 }} />
              <h3>Video unavailable</h3>
              <p>{tokenError ?? 'Could not generate a playback link. Please try again.'}</p>
              <button className="retry-button" onClick={loadDownloadToken}>
                Retry
              </button>
            </div>
          )}
        </div>

        <div className="video-detail-info">
          <h1 className="video-detail-title">{video.label || 'Untitled video'}</h1>

          <div className="video-detail-meta">
            {video.timestamp && (
              <span>
                <strong>Captured</strong> {formatDateTime(video.timestamp)}
              </span>
            )}
            <span>
              <strong>Duration</strong> {formatDuration(video.lengthInSeconds)}
            </span>
            <span>
              <strong>Size</strong> {formatBytes(video.sizeInBytes)}
            </span>
            {video.owner && (
              <span className="video-meta-owner">
                <strong>Owner</strong> <UserInfo user={video.owner} showAvatar={false} />
              </span>
            )}
          </div>

          {video.tags && video.tags.length > 0 && (
            <div className="video-detail-tags">
              {video.tags.map((tag) => (
                <span key={tag.id} className="video-detail-tag">
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Access & Sharing ─────────────────────────────────── */}
        <section className="video-access-section">
          <div className="video-access-header">
            <h2>Access & Sharing</h2>
          </div>

          {accessLoading ? (
            <div className="loading-container" style={{ padding: '30px 20px' }}>
              <div className="spinner" />
              <p>Loading access...</p>
            </div>
          ) : accessError ? (
            <div className="error-container">
              <p>{accessError}</p>
              <button className="retry-button" onClick={loadAccess}>
                Retry
              </button>
            </div>
          ) : (
            <div className="video-access-content">
              <div className="access-group">
                <h3>
                  <FontAwesomeIcon icon={faUser} /> Users
                </h3>
                {accessUsers.length === 0 ? (
                  <p className="access-empty">No users have direct access to this video.</p>
                ) : (
                  <ul className="access-list">
                    {accessUsers.map((entry) => (
                      <li key={entry.user.id} className="access-item">
                        <UserInfo user={entry.user} size={32} />
                        <span className={`access-level ${entry.accessLevel.toLowerCase()}`}>
                          {ACCESS_LEVEL_LABELS[entry.accessLevel]}
                        </span>
                        <button
                          className="access-remove-btn"
                          title="Remove access"
                          onClick={() => handleRemoveUserAccess(entry.user.id)}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="access-group">
                <h3>
                  <FontAwesomeIcon icon={faBuilding} /> Entities
                </h3>
                {accessEntities.length === 0 ? (
                  <p className="access-empty">No entities have access to this video.</p>
                ) : (
                  <ul className="access-list">
                    {accessEntities.map((entry) => (
                      <li key={entry.entity.id} className="access-item">
                        <span className="access-avatar">{entry.entity.name?.charAt(0).toUpperCase() ?? '?'}</span>
                        <span className="access-name">{entry.entity.name || 'Untitled entity'}</span>
                        <span className={`access-level ${entry.accessLevel.toLowerCase()}`}>
                          {ACCESS_LEVEL_LABELS[entry.accessLevel]}
                        </span>
                        <button
                          className="access-remove-btn"
                          title="Remove access"
                          onClick={() => handleRemoveEntityAccess(entry.entity.id)}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── Full Metadata ─────────────────────────────────────── */}
        <section className="video-metadata-section">
          <button
            type="button"
            className="video-metadata-header"
            onClick={() => setMetadataExpanded((prev) => !prev)}
            aria-expanded={metadataExpanded}
          >
            <h2>Metadata</h2>
            <FontAwesomeIcon
              icon={metadataExpanded ? faChevronUp : faChevronDown}
              className="metadata-chevron"
            />
          </button>
          {metadataExpanded && (
          <div className="video-metadata-grid">
            <MetadataItem label="Video ID" value={video.id} />
            <MetadataItem label="Label" value={video.label || '—'} />
            <MetadataItem label="Captured" value={formatDateTime(video.timestamp)} />
            <MetadataItem label="Duration" value={formatDuration(video.lengthInSeconds)} />
            <MetadataItem label="Size" value={formatBytes(video.sizeInBytes)} />
            <MetadataItem label="Aspect ratio" value={formatAspectRatio(video.aspectRatio)} />
            <MetadataItem
              label="Device orientation"
              value={formatEnum(DEVICE_ORIENTATION_LABELS, video.deviceOrientation)}
            />
            <MetadataItem
              label="Upload status"
              value={formatEnum(UPLOAD_STATUS_LABELS, video.uploadStatus)}
            />
            <MetadataItem
              label="Review status"
              value={formatEnum(REVIEW_STATUS_LABELS, video.reviewStatus)}
            />
            <MetadataItem
              label="Owner"
              value={video.owner ? <UserInfo user={video.owner} size={24} /> : '—'}
            />
            <MetadataItem
              label="Associated entities"
              value={formatEntityNames(video.associatedEntities)}
            />
            <MetadataItem label="Coaches" value={formatUserNames(video.coaches)} />
            <MetadataItem label="Tags" value={formatTagNames(video.tags)} />
            <MetadataItem label="Blob path" value={video.blobPath || '—'} />
            {/* ── Admin / audit data (kept at the bottom) ── */}
            <MetadataItem label="Created by" value={renderUserRef(video.createdByUser)} />
            <MetadataItem label="Created at" value={formatDateTime(video.createdAt)} />
            <MetadataItem label="Last modified by" value={renderUserRef(video.lastModifiedByUser)} />
            <MetadataItem label="Last modified at" value={formatDateTime(video.lastModifiedAt)} />
            <MetadataItem label="Deleted" value={formatBoolean(video.isDeleted)} />
            <MetadataItem label="Deleted at" value={formatDateTime(video.deletedAt)} />
            <MetadataItem label="Deleted by" value={renderUserRef(video.deletedByUser)} />
          </div>
          )}
        </section>

        {/* ── Share Modal ───────────────────────────────────────── */}
        {shareOpen && (
          <div className="modal-overlay" onClick={() => !shareSubmitting && setShareOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
              <div className="modal-header">
                <h3>Share video</h3>
                <button
                  className="close-btn"
                  onClick={() => setShareOpen(false)}
                  disabled={shareSubmitting}
                  aria-label="Close"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="modal-body">
                <div className="share-target-toggle">
                  <button
                    className={shareTarget === 'user' ? 'active' : ''}
                    onClick={() => setShareTarget('user')}
                    type="button"
                  >
                    <FontAwesomeIcon icon={faUser} /> User
                  </button>
                  <button
                    className={shareTarget === 'entity' ? 'active' : ''}
                    onClick={() => setShareTarget('entity')}
                    type="button"
                  >
                    <FontAwesomeIcon icon={faBuilding} /> Entity
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor="share-target">
                    {shareTarget === 'user' ? 'User' : 'Entity'}
                  </label>
                  {shareTarget === 'user' ? (
                    <VirtualizedSelect
                      id="share-target"
                      items={shareableUsers}
                      value={shareUserId}
                      onChange={(v) => setShareUserId(v ?? '')}
                      getOptionValue={(u) => u.id}
                      getOptionLabel={(u) => getDisplayName(u)}
                      renderOption={(u) => (
                        <>
                          <UserAvatar user={u} size={28} />
                          <span className="vs-option-text">{getDisplayName(u)}</span>
                        </>
                      )}
                      placeholder="Select a user..."
                      searchPlaceholder="Search users..."
                      emptyMessage="No users available"
                      clearable
                    />
                  ) : (
                    <VirtualizedSelect
                      id="share-target"
                      items={shareableEntities}
                      value={shareEntityId}
                      onChange={(v) => setShareEntityId(v ?? '')}
                      getOptionValue={(e) => e.id}
                      getOptionLabel={(e) => e.name || 'Untitled entity'}
                      renderOption={(e) => (
                        <>
                          <span className="vs-option-icon">
                            <FontAwesomeIcon icon={faBuilding} />
                          </span>
                          <span className="vs-option-text">{e.name || 'Untitled entity'}</span>
                        </>
                      )}
                      placeholder="Select an entity..."
                      searchPlaceholder="Search entities..."
                      emptyMessage="No entities available"
                      clearable
                    />
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="share-level">Access level</label>
                  <StyledSelect
                    id="share-level"
                    value={shareLevel}
                    onChange={(v) => setShareLevel(v as VideoAccessLevel)}
                  >
                    <option value="ReadOnly">Read only</option>
                    <option value="Review">Review</option>
                    <option value="Edit">Edit</option>
                  </StyledSelect>
                </div>

                {shareError && <p className="share-error">{shareError}</p>}

                <div className="modal-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => setShareOpen(false)}
                    disabled={shareSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    className="submit-btn"
                    onClick={handleShare}
                    disabled={shareSubmitting}
                  >
                    {shareSubmitting ? (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faShareNodes} style={{ marginRight: 6 }} />
                        Share
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Confirmation Modal ─────────────────────────── */}
        {deleteConfirmOpen && (
          <div className="modal-overlay" onClick={() => !deleteSubmitting && setDeleteConfirmOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
              <div className="modal-header">
                <h3>Delete Video</h3>
                <button
                  className="close-btn"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deleteSubmitting}
                  aria-label="Close"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="modal-body">
                <p className="delete-message">
                  Are you sure you want to delete <strong>{video.label || 'Untitled video'}</strong>?
                  This action cannot be undone.
                </p>
                {deleteError && <p className="share-error">{deleteError}</p>}
                <div className="modal-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => setDeleteConfirmOpen(false)}
                    disabled={deleteSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    className="submit-btn"
                    style={{ background: '#dc3545', color: '#fff' }}
                    onClick={handleDelete}
                    disabled={deleteSubmitting}
                  >
                    {deleteSubmitting ? (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return <div className="video-detail-page">{renderContent()}</div>;
}

export default VideoDetailPage;
