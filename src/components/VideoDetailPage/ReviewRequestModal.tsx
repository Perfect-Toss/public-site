import './VideoReviewsPanel.css';

import {
  faBuilding,
  faClipboardList,
  faSpinner,
  faTimes,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useState } from 'react';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { fetchAllEntities, type Entity } from '../../api/api.entities';
import { fetchAllUsers, type User } from '../../api/api.users';
import { createVideoReviewRequest } from '../../api/api.videos';
import { getDisplayName } from '../../utils/user';
import { OrganizationPicker, UserAvatar, VirtualizedSelect } from '../common';

export interface ReviewRequestModalProps {
  videoId: string;
  /** Close the popup without creating a request. */
  onClose: () => void;
  /** Called after a review request is successfully created. */
  onCreated: () => void | Promise<void>;
}

/**
 * Popup for requesting a review of a video from a specific user or entity the
 * current user can access. Uses the same user/entity toggle and the same
 * pickers as the share modal, so a target is chosen the same way everywhere.
 */
export function ReviewRequestModal({ videoId, onClose, onCreated }: ReviewRequestModalProps) {
  const [note, setNote] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [target, setTarget] = useState<'user' | 'entity'>('user');
  const [reviewerId, setReviewerId] = useState('');
  const [entityId, setEntityId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the users/entities the current user can access (same as the share picker).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [u, e] = await Promise.all([fetchAllUsers(), fetchAllEntities()]);
        if (!active) return;
        setUsers(u);
        setEntities(e);
      } catch (err) {
        console.error('Failed to load users/entities for review request:', err);
        if (active) setError('Could not load users/entities. Please try again.');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createVideoReviewRequest(videoId, {
        reviewerId: target === 'user' ? reviewerId || null : null,
        entityId: target === 'entity' ? entityId || null : null,
        requestNote: note.trim() || null,
      });
      await onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create review request:', err);
      setError('Failed to create the review request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [videoId, target, reviewerId, entityId, note, onCreated, onClose]);

  // Escape cancels the dialog, Enter submits. A picker with an open panel stops
  // Escape at the panel, so the dialog only closes on the next press.
  useModalKeyboard({
    active: true,
    onCancel: onClose,
    onAccept: () => void submit(),
    busy: submitting,
  });

  return (
    <div className="modal-overlay" onClick={() => !submitting && onClose()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
        <div className="modal-header">
          <h3>Request review</h3>
          <button
            className="close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="review-request-note">Note (optional)</label>
            <textarea
              id="review-request-note"
              className="vr-text review-note-text"
              rows={2}
              placeholder="Describe what should be reviewed..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="review-request-target">Request from (optional)</label>

            <div className="rr-toggle" role="group" aria-label="Request from">
              <button
                type="button"
                className={target === 'user' ? 'active' : ''}
                onClick={() => setTarget('user')}
              >
                <FontAwesomeIcon icon={faUser} /> User
              </button>
              <button
                type="button"
                className={target === 'entity' ? 'active' : ''}
                onClick={() => setTarget('entity')}
              >
                <FontAwesomeIcon icon={faBuilding} /> Entity
              </button>
            </div>

            {target === 'user' ? (
              <VirtualizedSelect
                id="review-request-target"
                items={users}
                value={reviewerId}
                onChange={(v) => setReviewerId(v ?? '')}
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
              <OrganizationPicker
                id="review-request-target"
                organizations={entities}
                value={entityId}
                onChange={setEntityId}
                showType
                placeholder="Select an organization..."
                searchPlaceholder="Search organizations..."
              />
            )}
          </div>

          {error && <p className="share-error">{error}</p>}

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              className="submit-btn"
              onClick={() => void submit()}
              disabled={submitting}
            >
              {submitting ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <>
                  <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: 6 }} />
                  Request review
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
