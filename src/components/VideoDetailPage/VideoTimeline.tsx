import './VideoTimeline.css';

import { useCallback, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { VideoReview } from '../../api/api.videos';
import { colorFor } from '../../utils/color';
import { getDisplayName } from '../../utils/user';
import { AudioPlayer, UserInfo } from '../common';
import { positionText, toDataUrl } from './reviewLabels';
import { buildVideoAnchors, formatPosition, type VideoAnchor } from './videoTime';

export interface VideoTimelineProps {
  reviews: VideoReview[];
  /** Video duration in seconds (fall back to metadata length). */
  duration: number;
  /** Review id to highlight as the active/selected marker. */
  activeReviewId?: string | null;
  /** Called when a review marker is clicked. */
  onSelectReview: (reviewId: string) => void;
}

/**
 * The review-marker strip shown above the custom video controls. Marks review
 * snapshots/general notes (dots) and segments (colored ranges). Hovering a
 * marker shows a popup with the review details; clicking selects it.
 */
export function VideoTimeline({
  reviews,
  duration,
  activeReviewId,
  onSelectReview,
}: VideoTimelineProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number } | null>(null);
  const hoverTimer = useRef<number | null>(null);

  // Measured width of the inner track, used to translate the fixed snapshot
  // dot size into video time so close markers stack instead of overlapping.
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [trackInnerWidth, setTrackInnerWidth] = useState(0);

  // Keep the popup open briefly after leaving a marker so it stays usable while
  // the pointer is over it (e.g. to click audio controls).
  const showPopup = useCallback((id: string, rect: DOMRect) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setHoverId(id);
    // Keep the popup fully on-screen even for markers near the edges (general
    // notes sit at position 0, so their popup would otherwise go off the left).
    const viewportMargin = 12;
    const popupHalf = Math.min(196, (window.innerWidth - viewportMargin * 2) / 2);
    const center = rect.left + rect.width / 2;
    const left = Math.min(window.innerWidth - popupHalf, Math.max(popupHalf, center));
    setHoverPos({ top: rect.top - 8, left });
  }, []);
  const endHover = useCallback(() => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHoverId(null), 150);
  }, []);
  const cancelHoverClose = useCallback(() => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }, []);

  // Measure the inner track once and on every resize. This runs before paint,
  // so the first painted frame already uses the measured width; without a DOM
  // (non-DOM tests) the width stays 0 and dots fall back to zero-width.
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setTrackInnerWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const safeDuration = Math.max(1, duration);
  const anchors = buildVideoAnchors(reviews);
  if (anchors.length === 0) return null;

  const reviewById = new Map(reviews.map((review) => [review.id, review]));
  const hoverAnchor = hoverId ? anchors.find((a) => a.id === hoverId) : undefined;
  const hoverReview = hoverId ? reviewById.get(hoverId) : undefined;

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
  // Segment bars render at the same height as snapshot dots so both marker
  // kinds read as equal-sized, identically-colored bubbles (border-box sizing).
  const SEGMENT_HEIGHT = DOT_SIZE;
  const EPS = 0.001;

  // Half of a snapshot dot's on-screen width, expressed in video time. Snapshot
  // bubbles have real width, so dots whose visual extents would collide are
  // stacked into different lanes. Before the track is measured (or in non-DOM
  // tests) this is 0, preserving the old "only equal timestamps overlap" case.
  const dotHalfSec =
    trackInnerWidth > 0 ? (DOT_SIZE / 2) * (safeDuration / trackInnerWidth) : 0;

  const isPoint = (it: { start: number; end: number }) => it.end - it.start <= EPS;
  const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => {
    const aPoint = isPoint(a);
    const bPoint = isPoint(b);
    if (aPoint && bPoint) {
      // Two dots collide when their centers are closer than the dot width
      // (dotHalfSec on each side); equal timestamps always overlap.
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

  const renderPopup = (review: VideoReview) => {
    const pos = positionText(review);
    const audioUrl = toDataUrl(review.audioData, review.audioMimeType, 'audio/webm');
    const drawingUrl = toDataUrl(review.drawingData, review.drawingMimeType, 'image/png');
    return (
      <>
        <div className="vtp-user">
          <UserInfo user={review.createdByUser ?? {}} size={34} />
          {pos && <span className="vtp-pos">{pos}</span>}
        </div>
        {review.text && <p className="vtp-text">{review.text}</p>}
        {audioUrl && <AudioPlayer src={audioUrl} className="vtp-audio" />}
        {drawingUrl && <img className="vtp-drawing" src={drawingUrl} alt="Review drawing" />}
      </>
    );
  };

  return (
    <div className="video-timeline" aria-label="Video review timeline">
      <div className="video-timeline-track" style={{ height: trackHeight }}>
        <div className="video-timeline-inner" ref={innerRef}>
        {placed.map((item) => {
          const anchor = item.anchor;
          const hoverBind = {
            onMouseEnter: (e: MouseEvent<HTMLButtonElement>) =>
              showPopup(anchor.id, e.currentTarget.getBoundingClientRect()),
            onMouseLeave: endHover,
            onFocus: (e: FocusEvent<HTMLButtonElement>) =>
              showPopup(anchor.id, e.currentTarget.getBoundingClientRect()),
            onBlur: endHover,
          };
          const centerY = laneCenterY(item.lane);
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
              onClick={() => onSelectReview(anchor.id)}
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
              onClick={() => onSelectReview(anchor.id)}
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
        {hoverAnchor &&
          hoverReview &&
          hoverPos &&
          createPortal(
            <div
              className="video-timeline-popup"
              role="tooltip"
              style={{ top: hoverPos.top, left: hoverPos.left }}
              onMouseEnter={cancelHoverClose}
              onMouseLeave={endHover}
            >
              {renderPopup(hoverReview)}
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
