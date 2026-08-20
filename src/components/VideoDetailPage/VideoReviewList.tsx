import './VideoReviewsPanel.css';

import { faChevronDown, faChevronUp, faClock, faSpinner, faTrash } from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import {
  deleteVideoReview,
  deleteVideoReviewRequest,
  type VideoReview,
  type VideoReviewRequest,
} from '../../api/api.videos';
import { formatDateTime } from '../../utils/format';
import { UserInfo } from '../common';
import {
  positionText,
  REQUEST_STATUS_LABELS,
  toDataUrl,
} from './reviewLabels';
import { sortReviewsByTime } from './videoTime';

export interface VideoReviewListProps {
  videoId: string;
  reviews: VideoReview[];
  requests: VideoReviewRequest[];
  loading: boolean;
  error: string | null;
  /** Re-fetch reviews (e.g. after adding/deleting). */
  reload: () => Promise<void>;
  /** Review id to scroll to + highlight (optional; no longer wired by default). */
  focusReviewId?: string | null;
  /** Called after the focused review has been scrolled to. */
  onFocusHandled?: () => void;
  /** Called when a review item is clicked so the player can seek/loop to it. */
  onSelectReview?: (reviewId: string) => void;
}

export function VideoReviewList({
  videoId,
  reviews,
  requests,
  loading,
  error,
  reload,
  focusReviewId,
  onFocusHandled,
  onSelectReview,
}: VideoReviewListProps) {
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const sortedReviews = sortReviewsByTime(reviews);

  // Scroll to + highlight the review selected from a timeline marker.
  useEffect(() => {
    if (!focusReviewId) return;
    // Ensure the section is open before scrolling to the item.
    setOpen(true);
    const raf = window.requestAnimationFrame(() => {
      const el = document.getElementById(`vr-item-${focusReviewId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightId(focusReviewId);
      onFocusHandled?.();
    });
    const timer = window.setTimeout(() => setHighlightId(null), 2500);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [focusReviewId, onFocusHandled]);

  const handleDeleteReview = useCallback(
    async (itemId: string) => {
      try {
        await deleteVideoReview(videoId, itemId);
        await reload();
      } catch (err) {
        console.error('Failed to delete review:', err);
      }
    },
    [videoId, reload],
  );

  const handleDeleteRequest = useCallback(
    async (requestId: string) => {
      try {
        await deleteVideoReviewRequest(videoId, requestId);
        await reload();
      } catch (err) {
        console.error('Failed to delete review request:', err);
      }
    },
    [videoId, reload],
  );

  const handleItemKeyDown = useCallback(
    (e: KeyboardEvent<HTMLLIElement>, reviewId: string) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      onSelectReview?.(reviewId);
    },
    [onSelectReview],
  );

  return (
    <section className="video-reviews-list-section">
      <button
        type="button"
        className="video-reviews-list-header"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
      >
        <h2>Reviews</h2>
        <span className="vr-list-count">{reviews.length}</span>
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="vr-chevron" />
      </button>

      {open && (
        <>
          {error && <p className="vr-error">{error}</p>}

          <h4 className="vr-list-title">Review requests</h4>
          {requests.length === 0 ? (
            <p className="vr-empty">No review requests.</p>
          ) : (
            <ul className="vr-list">
              {requests.map((request) => (
                <li key={request.id} className="vr-item vr-request-item">
                  <div className="vr-item-head">
                    <UserInfo user={request.requestedBy ?? {}} size={24} />
                    <span className={`vr-req-status vr-req-${(request.status ?? 'Unknown').toLowerCase()}`}>
                      {REQUEST_STATUS_LABELS[request.status ?? 'Unknown']}
                    </span>
                    <span className="vr-item-time">{formatDateTime(request.createdAt)}</span>
                    <button
                      type="button"
                      className="vr-delete"
                      title="Delete request"
                      onClick={() => void handleDeleteRequest(request.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                  {request.requestNote && <p className="vr-item-text">{request.requestNote}</p>}
                </li>
              ))}
            </ul>
          )}

          <h4 className="vr-list-title">Review items</h4>
          {loading ? (
            <p className="vr-empty">
              <FontAwesomeIcon icon={faSpinner} spin /> Loading reviews...
            </p>
          ) : reviews.length === 0 ? (
            <p className="vr-empty">No reviews yet. Add one using the composer on the video.</p>
          ) : (
            <ul className="vr-list">
              {sortedReviews.map((review) => {
                const pos = positionText(review);
                const audioUrl = toDataUrl(review.audioData, review.audioMimeType, 'audio/webm');
                const drawingUrl = toDataUrl(review.drawingData, review.drawingMimeType, 'image/png');
                return (
                  <li
                    key={review.id}
                    id={`vr-item-${review.id}`}
                    className={`vr-item${highlightId === review.id ? ' vr-item-highlight' : ''}${
                      onSelectReview ? ' vr-item-clickable' : ''
                    }`}
                    onClick={onSelectReview ? () => onSelectReview(review.id) : undefined}
                    onKeyDown={onSelectReview ? (e) => handleItemKeyDown(e, review.id) : undefined}
                    role={onSelectReview ? 'button' : undefined}
                    tabIndex={onSelectReview ? 0 : undefined}
                    title={onSelectReview ? 'Jump to this review in the video' : undefined}
                  >
                    <div className="vr-item-head">
                      <UserInfo user={review.createdByUser ?? {}} size={24} />
                      {pos && (
                        <span className="vr-item-pos">
                          <FontAwesomeIcon icon={faClock} />
                          {pos}
                        </span>
                      )}
                      <span className="vr-item-time">{formatDateTime(review.createdAt)}</span>
                      <button
                        type="button"
                        className="vr-delete"
                        title="Delete review"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteReview(review.id);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                    {review.text && <p className="vr-item-text">{review.text}</p>}
                    {audioUrl && (
                      <audio
                        controls
                        src={audioUrl}
                        className="vr-item-audio"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    {drawingUrl && (
                      <img className="vr-item-drawing" src={drawingUrl} alt="Review drawing" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
