import './VideoReviewsPanel.css';

import {
  faBuilding,
  faCheck,
  faChevronDown,
  faClipboardList,
  faSearch,
  faSpinner,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { fetchAllEntities, type Entity } from '../../api/api.entities';
import { fetchAllUsers, type User } from '../../api/api.users';
import { createVideoReviewRequest } from '../../api/api.videos';
import { getDisplayName } from '../../utils/user';
import { UserAvatar } from '../common';

export interface ReviewRequestModalProps {
  videoId: string;
  /** Close the popup without creating a request. */
  onClose: () => void;
  /** Called after a review request is successfully created. */
  onCreated: () => void | Promise<void>;
}

/**
 * Popup for requesting a review of a video from a specific user or entity the
 * current user can access. Mirrors the share modal's user/entity picker.
 */
export function ReviewRequestModal({ videoId, onClose, onCreated }: ReviewRequestModalProps) {
  const [note, setNote] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selection, setSelection] = useState<{ kind: 'user' | 'entity'; id: string } | null>(
    null,
  );
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  // Close the dropdown on outside click / Escape. The panel is portaled to
  // <body>, so both the trigger and the panel count as "inside".
  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent | TouchEvent) => {
      const node = ev.target as Node;
      const inTrigger = containerRef.current?.contains(node);
      const inPanel = panelRef.current?.contains(node);
      if (!inTrigger && !inPanel) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Measure the trigger so the portaled panel can sit just below it, and keep
  // it aligned if the page scrolls or resizes while open.
  const updatePanelPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePanelPos();
    window.addEventListener('resize', updatePanelPos);
    window.addEventListener('scroll', updatePanelPos, true);
    return () => {
      window.removeEventListener('resize', updatePanelPos);
      window.removeEventListener('scroll', updatePanelPos, true);
    };
  }, [open, updatePanelPos]);

  const q = query.trim().toLowerCase();
  const filteredUsers = users
    .filter((u) => getDisplayName(u).toLowerCase().includes(q))
    .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
  const filteredEntities = entities
    .filter((e) => (e.name ?? '').toLowerCase().includes(q))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  const selectedUser =
    selection?.kind === 'user' ? users.find((u) => u.id === selection.id) : undefined;
  const selectedEntity =
    selection?.kind === 'entity' ? entities.find((e) => e.id === selection.id) : undefined;

  const selectOption = useCallback((kind: 'user' | 'entity', id: string) => {
    setSelection({ kind, id });
    setQuery('');
    setOpen(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setQuery('');
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createVideoReviewRequest(videoId, {
        reviewerId: selection?.kind === 'user' ? selection.id : null,
        entityId: selection?.kind === 'entity' ? selection.id : null,
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
  }, [videoId, selection, note, onCreated, onClose]);

  // Escape cancels the dialog; Enter submits. The dropdown's own Escape handler
  // (registered later, when it opens) runs after this one, so while the dropdown
  // is open Escape only closes the dropdown first.
  useModalKeyboard({
    active: true,
    onCancel: () => {
      if (open) {
        setOpen(false);
      } else {
        onClose();
      }
    },
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
            <div className="review-target" ref={containerRef}>
              <button
                ref={triggerRef}
                type="button"
                className="review-target-trigger"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="listbox"
              >
                {selectedUser ? (
                  <span className="review-target-selected">
                    <UserAvatar user={selectedUser} size={22} />
                    <span>{getDisplayName(selectedUser)}</span>
                  </span>
                ) : selectedEntity ? (
                  <span className="review-target-selected">
                    <FontAwesomeIcon icon={faBuilding} />
                    <span>{selectedEntity.name || 'Untitled entity'}</span>
                  </span>
                ) : (
                  <span className="review-target-placeholder">
                    Select a user or entity (optional)...
                  </span>
                )}
                {selection ? (
                  <button
                    type="button"
                    className="review-target-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelection();
                    }}
                    aria-label="Clear selection"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                ) : (
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`review-target-chevron${open ? ' open' : ''}`}
                  />
                )}
              </button>

              {open &&
                panelPos &&
                createPortal(
                <div
                  className="review-target-panel"
                  ref={panelRef}
                  role="listbox"
                  aria-label="Users and entities"
                  style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
                >
                  <div className="review-target-search">
                    <FontAwesomeIcon icon={faSearch} />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search users and entities..."
                      aria-label="Search users and entities"
                    />
                  </div>
                  <div className="review-target-groups">
                    <div className="review-target-group-label">Entities</div>
                    {filteredEntities.length === 0 ? (
                      <p className="review-target-empty">No matching entities</p>
                    ) : (
                      filteredEntities.map((e) => {
                        const name = e.name || 'Untitled entity';
                        const detail = e.description || e.entityType || null;
                        return (
                          <button
                            key={`entity-${e.id}`}
                            type="button"
                            role="option"
                            aria-selected={selection?.kind === 'entity' && selection.id === e.id}
                            className={`review-target-option${
                              selection?.kind === 'entity' && selection.id === e.id ? ' selected' : ''
                            }`}
                            onClick={() => selectOption('entity', e.id)}
                          >
                            <span className="review-target-kind-icon">
                              <FontAwesomeIcon icon={faBuilding} />
                            </span>
                            <span className="review-target-option-text">
                              <span className="review-target-option-primary">{name}</span>
                              {detail && (
                                <span className="review-target-option-secondary">{detail}</span>
                              )}
                            </span>
                            {selection?.kind === 'entity' && selection.id === e.id && (
                              <FontAwesomeIcon icon={faCheck} className="review-target-check" />
                            )}
                          </button>
                        );
                      })
                    )}

                    <div className="review-target-group-label">Users</div>
                    {filteredUsers.length === 0 ? (
                      <p className="review-target-empty">No matching users</p>
                    ) : (
                      filteredUsers.map((u) => {
                        const name = getDisplayName(u);
                        return (
                          <button
                            key={`user-${u.id}`}
                            type="button"
                            role="option"
                            aria-selected={selection?.kind === 'user' && selection.id === u.id}
                            className={`review-target-option${
                              selection?.kind === 'user' && selection.id === u.id ? ' selected' : ''
                            }`}
                            onClick={() => selectOption('user', u.id)}
                          >
                            <UserAvatar user={u} size={28} />
                            <span className="review-target-option-text">
                              <span className="review-target-option-primary">{name}</span>
                              {u.email && u.email !== name && (
                                <span className="review-target-option-secondary">{u.email}</span>
                              )}
                            </span>
                            {selection?.kind === 'user' && selection.id === u.id && (
                              <FontAwesomeIcon icon={faCheck} className="review-target-check" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>,
                document.body,
              )}
            </div>
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
