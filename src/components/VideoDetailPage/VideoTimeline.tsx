import './VideoTimeline.css';

import { useCallback, useRef, useState, type FocusEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { VideoReview } from '../../api/api.videos';
import { colorFor, hexToRgba } from '../../utils/color';
import { getDisplayName } from '../../utils/user';
import { AudioPlayer, UserInfo } from '../common';
import { positionText, toDataUrl } from './reviewLabels';
import { buildVideoAnchors, formatPosition } from './videoTime';

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

  const safeDuration = Math.max(1, duration);
  const anchors = buildVideoAnchors(reviews);
  if (anchors.length === 0) return null;

  const reviewById = new Map(reviews.map((review) => [review.id, review]));
  const hoverAnchor = hoverId ? anchors.find((a) => a.id === hoverId) : undefined;
  const hoverReview = hoverId ? reviewById.get(hoverId) : undefined;

  const pct = (seconds: number) =>
    `${Math.min(100, Math.max(0, (seconds / safeDuration) * 100))}%`;

  /** Resolve the reviewer's color (stored colorHex, if present, else name-derived). */
  const reviewColor = (review?: VideoReview | null): string => {
    const user = review?.createdByUser as
      | {
          colorHex?: string | null;
          firstName?: string | null;
          lastName?: string | null;
          email?: string | null;
        }
      | undefined;
    return user?.colorHex ?? colorFor(getDisplayName(user ?? {}));
  };

  // Order by start time so reviews read left-to-right.
  const ordered = anchors
    .map((anchor) => ({
      anchor,
      color: reviewColor(reviewById.get(anchor.id)),
      start: anchor.start,
      end: anchor.end != null ? anchor.end : anchor.start,
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

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
      <div className="video-timeline-track">
        {ordered.map((item) => {
          const anchor = item.anchor;
          const hoverBind = {
            onMouseEnter: (e: MouseEvent<HTMLButtonElement>) =>
              showPopup(anchor.id, e.currentTarget.getBoundingClientRect()),
            onMouseLeave: endHover,
            onFocus: (e: FocusEvent<HTMLButtonElement>) =>
              showPopup(anchor.id, e.currentTarget.getBoundingClientRect()),
            onBlur: endHover,
          };
          return anchor.end != null ? (
            <button
              key={anchor.id}
              type="button"
              className={`video-timeline-segment${anchor.id === activeReviewId ? ' active' : ''}`}
              style={{
                left: pct(anchor.start),
                width: pct(anchor.end - anchor.start),
                background: hexToRgba(item.color, 0.4),
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
