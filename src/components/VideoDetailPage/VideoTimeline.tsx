import './VideoTimeline.css';

import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { VideoReview } from '../../api/api.videos';
import { colorFor } from '../../utils/color';
import { getDisplayName } from '../../utils/user';
import { VideoReviewDetails } from './VideoReviewDetails';
import { buildVideoAnchors, formatPosition, type VideoAnchor } from './videoTime';

/** Hover time (ms) before a marker opens its review popup. */
const HOVER_OPEN_DELAY_MS = 350;

/** Track width assumed before the bar has been measured (px). */
const ASSUMED_TRACK_WIDTH = 800;

/** Popup anchor position (viewport px). */
interface PopupPosition {
  top: number;
  left: number;
}

export interface VideoTimelineProps {
  reviews: VideoReview[];
  /** Video the reviews belong to; required to resolve audio/drawing content. */
  videoId?: string | null;
  /** Video duration in seconds (fall back to metadata length). */
  duration: number;
  /** Review id to highlight as the active/selected marker. */
  activeReviewId?: string | null;
  /** Called when a review marker is clicked. */
  onSelectReview: (reviewId: string) => void;
  /**
   * Draw the markers over the filmstrip scrub bar instead of in their own
   * strip: the rail turns transparent and a press falls through to the bar
   * underneath so the whole bar stays scrubbable.
   */
  embedded?: boolean;
}

interface ReviewPopupContentProps {
  videoId?: string | null;
  review: VideoReview;
  /** Pinned popups stay up until dismissed, so they carry their own close control. */
  onClose?: () => void;
}

/** Popup body for a marker — the SAME component the review list renders. */
function ReviewPopupContent({ videoId, review, onClose }: ReviewPopupContentProps) {
  return (
    <VideoReviewDetails
      videoId={videoId}
      review={review}
      size={34}
      trailing={
        onClose ? (
          <button
            type="button"
            className="video-timeline-popup-close"
            onClick={onClose}
            aria-label="Close review"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        ) : undefined
      }
    />
  );
}

/**
 * The review-marker strip shown above the custom video controls. Marks review
 * snapshots/general notes (dots) and segments (colored ranges). Hovering a
 * marker previews the review; selecting it pins that preview open until it is
 * closed (close button, Esc, or a press outside it).
 */
export function VideoTimeline({
  reviews,
  videoId,
  duration,
  activeReviewId,
  onSelectReview,
  embedded = false,
}: VideoTimelineProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<PopupPosition | null>(null);
  /** Selected review's popup — pinned open, unlike the transient hover preview. */
  const [pinned, setPinned] = useState<(PopupPosition & { id: string }) | null>(null);
  /** Pending "hover long enough to open the popup" timer. */
  const openTimer = useRef<number | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Measured width of the inner track, used to translate the fixed snapshot
  // dot size into video time so close markers stack instead of overlapping.
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [trackInnerWidth, setTrackInnerWidth] = useState(0);

  const cancelPendingPopup = useCallback(() => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    openTimer.current = null;
  }, []);

  /**
   * Popup position: above the marker, kept fully on-screen even for markers near
   * the edges (general notes sit at position 0, so their popup would otherwise
   * go off the left).
   */
  const popupPosition = useCallback((rect: DOMRect): PopupPosition => {
    const viewportMargin = 12;
    const popupHalf = Math.min(196, (window.innerWidth - viewportMargin * 2) / 2);
    const center = rect.left + rect.width / 2;
    const left = Math.min(window.innerWidth - popupHalf, Math.max(popupHalf, center));
    return { top: rect.top - 8, left };
  }, []);

  /** Show the hover preview now (positioned above the marker). */
  const showPopup = useCallback(
    (id: string, rect: DOMRect) => {
      cancelPendingPopup();
      setHoverId(id);
      setHoverPos(popupPosition(rect));
    },
    [cancelPendingPopup, popupPosition],
  );

  /**
   * Pointer hover waits briefly before opening: the markers sit on the scrub bar,
   * so sweeping across it to scrub must not be interrupted by popups flashing up
   * under the pointer. Keyboard focus opens immediately.
   */
  const schedulePopup = useCallback(
    (id: string, rect: DOMRect) => {
      cancelPendingPopup();
      openTimer.current = window.setTimeout(() => {
        openTimer.current = null;
        showPopup(id, rect);
      }, HOVER_OPEN_DELAY_MS);
    },
    [cancelPendingPopup, showPopup],
  );

  const endHover = useCallback(() => {
    cancelPendingPopup();
    setHoverId(null);
  }, [cancelPendingPopup]);

  /** Dismiss the pinned popup (its close button, Esc, or a press outside it). */
  const closePinned = useCallback(() => {
    setPinned(null);
    setHoverId(null);
  }, []);

  // A pinned popup outlives the pointer: only Esc or a press outside it closes it.
  useEffect(() => {
    if (!pinned) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePinned();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && popupRef.current?.contains(event.target)) return;
      closePinned();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [pinned, closePinned]);

  // Drop the pinned popup when its review is no longer there (deleted elsewhere).
  useEffect(() => {
    if (pinned && !reviews.some((item) => item.id === pinned.id)) setPinned(null);
  }, [pinned, reviews]);

  // Drop any pending popup when the timeline goes away.
  useEffect(() => () => cancelPendingPopup(), [cancelPendingPopup]);

  // Measure the inner track once, after layout, and on every resize. The extra
  // animation-frame pass covers a first paint where the bar had no width yet.
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setTrackInnerWidth(el.clientWidth);
    update();
    const raf = window.requestAnimationFrame(update);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(el);
    return () => {
      window.cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  const safeDuration = Math.max(1, duration);
  const anchors = buildVideoAnchors(reviews);
  if (anchors.length === 0) return null;

  const reviewById = new Map(reviews.map((review) => [review.id, review]));
  // A pinned (selected) preview wins over the transient hover one.
  const popupId = pinned?.id ?? hoverId;
  const popupAnchor = popupId ? anchors.find((item) => item.id === popupId) : undefined;
  const popupReview = popupId ? reviewById.get(popupId) : undefined;
  const popupAt = pinned ? { top: pinned.top, left: pinned.left } : hoverPos;

  const pct = (seconds: number) =>
    `${Math.min(100, Math.max(0, (seconds / safeDuration) * 100))}%`;

  // ── Reviewer color resolution ────────────────────────────────────────
  // A person should appear in ONE color across all of their markers. Each
  // review embeds the author's UserInfo, but different records for the same
  // author can disagree: an older/edge review may carry a missing or defaulted
  // near-white colorHex while a sibling review by the same person has the real
  // color — which made a point dot and its range look different. To keep a
  // ranged review looking like a point review from the same person, unify:
  // scan every review once, remember the first explicit (non-"unset" white)
  // colorHex per author, and use that for all of that author's markers.
  type ReviewUserRef = {
    id?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    colorHex?: string | null;
  };

  /** Near-white reads as invisible on the dark track → treat as "no color chosen". */
  const isUnsetColor = (hex?: string | null): boolean => {
    if (!hex) return true;
    const c = hex.replace('#', '').toLowerCase();
    if (c.length < 6) return true;
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return r > 230 && g > 230 && b > 230;
  };

  const reviewerKey = (user?: ReviewUserRef | null): string =>
    user?.id ?? user?.email ?? getDisplayName(user ?? {});

  const reviewerColor = new Map<string, string>();
  for (const review of reviews) {
    const user = review.createdByUser as ReviewUserRef | undefined;
    const key = reviewerKey(user);
    if (!key || isUnsetColor(user?.colorHex)) continue;
    if (!reviewerColor.has(key)) reviewerColor.set(key, user!.colorHex!);
  }

  /** Resolve the author's color: the unified per-person color, else name-derived. */
  const reviewColor = (review?: VideoReview | null): string => {
    const user = review?.createdByUser as ReviewUserRef | undefined;
    const key = reviewerKey(user);
    return (key && reviewerColor.get(key)) || colorFor(getDisplayName(user ?? {}));
  };

  // ── Stacked lane layout ─────────────────────────────────────────────
  const LANE_PITCH = 18;
  const DOT_SIZE = 12;
  // Ring drawn just outside a marker's body while it is the selected one.
  const SELECTION_RING = 3;
  // Half the space a marker takes on screen: its body plus that ring.
  const MARKER_RADIUS = DOT_SIZE / 2 + SELECTION_RING;
  // Segment bars render at the same height as snapshot dots so both marker
  // kinds read as equal-sized, identically-colored bubbles (border-box sizing).
  const SEGMENT_HEIGHT = DOT_SIZE;
  const EPS = 0.001;

  // Half of a marker's on-screen width, expressed in video time. Markers have
  // real width (ring included), so any whose visual extents would touch are
  // stacked into different lanes. Until the bar reports a width we assume a
  // nominal one: falling back to 0 would let near-coincident markers share a
  // lane and overlap, which is exactly the bug this guards.
  const assumedWidth = trackInnerWidth > 0 ? trackInnerWidth : ASSUMED_TRACK_WIDTH;
  const dotHalfSec = MARKER_RADIUS * (safeDuration / assumedWidth);

  const isPoint = (it: { start: number; end: number }) => it.end - it.start <= EPS;
  const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => {
    const aPoint = isPoint(a);
    const bPoint = isPoint(b);
    if (aPoint && bPoint) {
      // Two dots collide when their centers are closer than their combined
      // half-widths (ring included); equal timestamps always overlap.
      return Math.abs(a.start - b.start) <= 2 * dotHalfSec;
    }
    if (aPoint) return b.start <= a.start + dotHalfSec && a.start - dotHalfSec < b.end;
    if (bPoint) return a.start <= b.start + dotHalfSec && b.start - dotHalfSec < a.end;
    return a.start < b.end && b.start < a.end;
  };

  interface PlacedItem {
    anchor: VideoAnchor;
    color: string;
    start: number;
    end: number;
    lane: number;
  }

  // Order by start time (then end) so reviews read left-to-right.
  const ordered = anchors
    .map((anchor) => ({
      anchor,
      color: reviewColor(reviewById.get(anchor.id)),
      start: anchor.start,
      end: anchor.end != null ? anchor.end : anchor.start,
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  // Greedy interval coloring: each item goes in the lowest free lane; lane 0 is
  // the BOTTOM, so overlapping reviews stack vertically, bottom-up. The track
  // below grows to fit every lane, so the bubbles always stay inside the bar
  // (same containment behavior as the anchor control).
  const laneLast: Array<{ start: number; end: number }> = [];
  const placed: PlacedItem[] = ordered.map((item) => {
    const lane = laneLast.findIndex((last) => !overlaps(item, last));
    if (lane === -1) {
      laneLast.push(item);
      return { ...item, lane: laneLast.length - 1 };
    }
    laneLast[lane] = item;
    return { ...item, lane };
  });

  const laneCount = Math.max(1, laneLast.length);
  const trackHeight = laneCount * LANE_PITCH;
  /** Vertical center (px from the top) of a lane; lane 0 is at the bottom. */
  const laneCenterY = (lane: number) => trackHeight - lane * LANE_PITCH - LANE_PITCH / 2;

  const renderPopup = (review: VideoReview, onClose?: () => void) => (
    <ReviewPopupContent videoId={videoId} review={review} onClose={onClose} />
  );

  return (
    <div
      className={`video-timeline${embedded ? ' video-timeline--embedded' : ''}`}
      aria-label="Video review timeline"
    >
      <div className="video-timeline-track" style={{ height: trackHeight }}>
        <div className="video-timeline-inner" ref={innerRef}>
        {placed.map((item) => {
          const anchor = item.anchor;
          const hoverBind = {
            onMouseEnter: (e: MouseEvent<HTMLButtonElement>) =>
              schedulePopup(anchor.id, e.currentTarget.getBoundingClientRect()),
            onMouseLeave: endHover,
            onFocus: (e: FocusEvent<HTMLButtonElement>) =>
              showPopup(anchor.id, e.currentTarget.getBoundingClientRect()),
            onBlur: endHover,
          };
          const centerY = laneCenterY(item.lane);
          // Selecting pins the preview open; it closes on request or a press outside.
          const select = (event: MouseEvent<HTMLButtonElement>) => {
            endHover();
            setPinned({ id: anchor.id, ...popupPosition(event.currentTarget.getBoundingClientRect()) });
            onSelectReview(anchor.id);
          };
          return anchor.end != null ? (
            <button
              key={anchor.id}
              type="button"
              className={`video-timeline-segment${anchor.id === activeReviewId ? ' active' : ''}`}
              style={{
                left: pct(anchor.start),
                width: pct(anchor.end - anchor.start),
                top: centerY,
                height: SEGMENT_HEIGHT,
                // Solid reviewer color (no translucency), matching the dot markers.
                background: item.color,
              }}
              onClick={select}
              aria-label={`Segment review ${formatPosition(anchor.start)} – ${formatPosition(anchor.end)}`}
              {...hoverBind}
            />
          ) : (
            <button
              key={anchor.id}
              type="button"
              className={`video-timeline-marker${anchor.general ? ' general' : ''}${
                anchor.hasDrawing ? ' has-drawing' : ''
              }${anchor.id === activeReviewId ? ' active' : ''}`}
              style={{
                left: pct(anchor.start),
                top: centerY,
                width: DOT_SIZE,
                height: DOT_SIZE,
                background: item.color,
              }}
              onClick={select}
              aria-label={
                anchor.general
                  ? 'General review (start of video)'
                  : `Snapshot review at ${formatPosition(anchor.start)}`
              }
              {...hoverBind}
            />
          );
        })}
        </div>
        {popupAnchor &&
          popupReview &&
          popupAt &&
          createPortal(
            <div
              ref={pinned ? popupRef : undefined}
              className={`video-timeline-popup${pinned ? ' video-timeline-popup--pinned' : ''}`}
              role={pinned ? 'dialog' : 'tooltip'}
              aria-label={pinned ? 'Selected review' : undefined}
              style={popupAt}
            >
              {renderPopup(popupReview, pinned ? closePinned : undefined)}
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
