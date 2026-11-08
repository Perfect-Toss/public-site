import './VideoReviewsPanel.css';

import {
  faChevronDown,
  faChevronUp,
  faRotateRight,
  faSpinner,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import {
  deleteVideoReview,
  retranscribeVideoReview,
  type VideoReview,
} from '../../api/api.videos';
import { formatDateTime } from '../../utils/format';
import { VideoReviewDetails } from './VideoReviewDetails';
import { sortReviewsByTime } from './videoTime';

export interface VideoReviewListProps {
  videoId: string;
  reviews: VideoReview[];
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
