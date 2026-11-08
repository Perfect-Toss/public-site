import './VideoReviewsPanel.css';

import {
  faChevronDown,
  faChevronUp,
  faComments,
  faPlus,
  faRotateRight,
  faSpinner,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import {
  deleteVideoReview,
  deleteVideoReviewRequest,
  retranscribeVideoReview,
  type VideoReview,
  type VideoReviewRequest,
} from '../../api/api.videos';
import { formatDateTime } from '../../utils/format';
import { getDisplayName } from '../../utils/user';
import { UserAvatar, UserInfo } from '../common';
import { VideoReviewDetails } from './VideoReviewDetails';
import { sortReviewsByTime } from './videoTime';

/** The person or entity a request is addressed to, shown with its avatar/initial. */
function RequestTarget({ request }: { request: VideoReviewRequest }) {
  const reviewer = request.requestedReviewer;
  if (reviewer) {
    return (
      <span className="vr-request-target-chip">
        <UserAvatar user={reviewer} size={20} />
        <span className="vr-request-target-name">{getDisplayName(reviewer)}</span>
      </span>
    );
  }
  const entityName = request.requestedEntity?.name?.trim();
  if (entityName) {
    return (
      <span className="vr-request-target-chip">
        <span className="vr-request-entity-mark" aria-hidden="true">
          {entityName.charAt(0).toUpperCase()}
        </span>
        <span className="vr-request-target-name">{entityName}</span>
      </span>
    );
  }
  return (
    <span className="vr-request-target-chip">
      <span className="vr-request-target-name">anyone with access</span>
    </span>
  );
}

export interface VideoReviewListProps {
  videoId: string;
  reviews: VideoReview[];
  /** Review requests for this video; only the OPEN ones are surfaced here. */
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
  /** Opens the request-review dialog; the page owns it. */
  onRequestReview?: () => void;
}

interface ReviewListItemProps {
  videoId: string;
  review: VideoReview;
  highlighted: boolean;
  selectable: boolean;
  onSelect?: (reviewId: string) => void;
  onDelete: (reviewId: string) => void;
  onRetranscribe: (reviewId: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLLIElement>, reviewId: string) => void;
}

function ReviewListItem({
  videoId,
  review,
  highlighted,
  selectable,
  onSelect,
  onDelete,
  onRetranscribe,
  onKeyDown,
}: ReviewListItemProps) {
  const isAudio = review.contentKind === 'Audio';

  return (
    <li
      id={`vr-item-${review.id}`}
      className={`vr-item${highlighted ? ' vr-item-highlight' : ''}${
        selectable ? ' vr-item-clickable' : ''
      }`}
      onClick={selectable && onSelect ? () => onSelect(review.id) : undefined}
      onKeyDown={selectable && onSelect ? (e) => onKeyDown(e, review.id) : undefined}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      title={selectable ? 'Jump to this review in the video' : undefined}
    >
      <VideoReviewDetails
        videoId={videoId}
        review={review}
        audioPlayer
        trailing={
          <>
            <span className="vr-item-time">{formatDateTime(review.createdAt)}</span>
            <button
              type="button"
              className="vr-delete"
              title="Delete review"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(review.id);
              }}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </>
        }
      />

      {isAudio && review.transcriptionStatus === 'Pending' && (
        <p className="vr-transcribing">
          <FontAwesomeIcon icon={faSpinner} spin /> Transcribing…
        </p>
      )}
      {isAudio && review.transcriptionStatus === 'Failed' && (
        <button
          type="button"
          className="vr-retranscribe"
          onClick={(e) => {
            e.stopPropagation();
            onRetranscribe(review.id);
          }}
        >
          <FontAwesomeIcon icon={faRotateRight} />
          Retry transcription
        </button>
      )}
    </li>
  );
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
  onRequestReview,
}: VideoReviewListProps) {
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const sortedReviews = sortReviewsByTime(reviews);
  // A request only needs surfacing while it is still waiting on a review.
  const activeRequests = requests.filter((request) => request.status === 'Open');

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

  const handleRetranscribe = useCallback(
    async (itemId: string) => {
      try {
        await retranscribeVideoReview(videoId, itemId);
        await reload();
      } catch (err) {
        console.error('Failed to retranscribe review:', err);
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
      <div className="video-reviews-list-header">
        <button
          type="button"
          className="video-section-toggle"
          onClick={() => setOpen((isOpen) => !isOpen)}
          aria-expanded={open}
        >
          <h2>
            <FontAwesomeIcon icon={faComments} />
            Reviews
          </h2>
          <span className="vr-list-count">{reviews.length}</span>
        </button>
        {onRequestReview && (
          <button
            className="secondary-btn"
            onClick={onRequestReview}
            title="Request review"
            aria-label="Request review"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Request review</span>
          </button>
        )}
        <button
          type="button"
          className="video-section-chevron"
          onClick={() => setOpen((isOpen) => !isOpen)}
          aria-expanded={open}
          aria-label="Toggle Reviews"
        >
          <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} />
        </button>
      </div>

      {open && (
        <>
          {error && <p className="vr-error">{error}</p>}

          {activeRequests.length > 0 && (
            <>
              <ul className="vr-list vr-request-list">
                {activeRequests.map((request) => (
                  <li key={request.id} className="vr-item">
                    <div className="vr-details-head">
                      <UserInfo user={request.requestedBy ?? {}} size={24} />
                      <span className="vr-req-status vr-req-open">Open</span>
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
                    <div className="vr-request-target">
                      <span>Review requested from</span>
                      <RequestTarget request={request} />
                    </div>
                    {request.requestNote && (
                      <blockquote className="vr-request-note">{request.requestNote}</blockquote>
                    )}
                  </li>
                ))}
              </ul>
              <hr className="vr-group-divider" />
            </>
          )}

          {loading ? (
            <p className="vr-empty">
              <FontAwesomeIcon icon={faSpinner} spin /> Loading reviews...
            </p>
          ) : reviews.length === 0 ? (
            <p className="vr-empty">No reviews yet. Add one using the composer on the video.</p>
          ) : (
            <ul className="vr-list">
              {sortedReviews.map((review) => (
                <ReviewListItem
                  key={review.id}
                  videoId={videoId}
                  review={review}
                  highlighted={highlightId === review.id}
                  selectable={Boolean(onSelectReview)}
                  onSelect={onSelectReview}
                  onDelete={handleDeleteReview}
                  onRetranscribe={handleRetranscribe}
                  onKeyDown={handleItemKeyDown}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
