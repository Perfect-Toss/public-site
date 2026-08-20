import { useCallback, useRef } from 'react';
import type { VideoReview } from '../../api/api.videos';
import { parseTimeSpanToSeconds } from './videoTime';

/** An anchor to a position in the video: a single point (snapshot) or a range (segment). */
export type ReviewAnchor =
  | { kind: 'none' }
  | { kind: 'snapshot'; time: number }
  | { kind: 'segment'; start: number; end: number };

export interface AnchorPickerProps {
  /** Total video duration in seconds. */
  duration: number;
  /** Existing reviews, shown as faint reference markers. */
  reviews: VideoReview[];
  /** Show faint reference markers for existing reviews (default `true`). */
  showReferenceMarks?: boolean;
  anchor: ReviewAnchor;
  onChange: (anchor: ReviewAnchor) => void;
  /** Called once a tap/drag gesture ends with the committed anchor. */
  onCommit?: (anchor: ReviewAnchor) => void;
}

/**
 * A single timeline control for anchoring a review. Tap (or click) to set a
 * snapshot point; drag to select a segment range. The selected range's caps can
 * be dragged to resize it.
 */
export function AnchorPicker({
  duration,
  reviews,
  showReferenceMarks = true,
  anchor,
  onChange,
  onCommit,
}: AnchorPickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    | { type: 'none' }
    | { type: 'pending'; downClientX: number; startTime: number }
    | { type: 'create-segment'; startTime: number }
    | { type: 'move-segment'; offset: number }
    | { type: 'dot' }
    | { type: 'resize-start' }
    | { type: 'resize-end' }
  >({ type: 'none' });

  const safeDuration = Math.max(0.001, duration);
  const clamp = useCallback(
    (value: number) => Math.min(Math.max(0, value), safeDuration),
    [safeDuration],
  );

  const timeFromEvent = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      return clamp(((clientX - rect.left) / rect.width) * safeDuration);
    },
    [clamp, safeDuration],
  );

  const onTrackDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        type: 'pending',
        downClientX: e.clientX,
        startTime: timeFromEvent(e.clientX),
      };
    },
    [timeFromEvent],
  );

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const t = timeFromEvent(e.clientX);
      if (drag.type === 'pending') {
        if (Math.abs(e.clientX - drag.downClientX) > 6) {
          dragRef.current = { type: 'create-segment', startTime: drag.startTime };
          onChange({
            kind: 'segment',
            start: Math.min(drag.startTime, t),
            end: Math.max(drag.startTime, t),
          });
        }
      } else if (drag.type === 'create-segment') {
        onChange({
          kind: 'segment',
          start: Math.min(drag.startTime, t),
          end: Math.max(drag.startTime, t),
        });
      } else if (drag.type === 'move-segment' && anchor.kind === 'segment') {
        const span = anchor.end - anchor.start;
        const start = clamp(t - drag.offset);
        onChange({ kind: 'segment', start, end: clamp(start + span) });
      } else if (drag.type === 'dot') {
        onChange({ kind: 'snapshot', time: t });
      } else if (drag.type === 'resize-start' && anchor.kind === 'segment') {
        onChange({ kind: 'segment', start: clamp(Math.min(t, anchor.end)), end: anchor.end });
      } else if (drag.type === 'resize-end' && anchor.kind === 'segment') {
        onChange({ kind: 'segment', start: anchor.start, end: clamp(Math.max(t, anchor.start)) });
      }
    },
    [anchor, clamp, onChange, timeFromEvent],
  );

  const onUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag.type === 'pending') {
        // A tap/click with no drag → snapshot point.
        const snapshot = { kind: 'snapshot' as const, time: timeFromEvent(e.clientX) };
        onChange(snapshot);
        onCommit?.(snapshot);
      } else {
        onCommit?.(anchor);
      }
      dragRef.current = { type: 'none' };
    },
    [onChange, onCommit, timeFromEvent, anchor],
  );

  const onDotDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { type: 'dot' };
    },
    [],
  );

  const onHandleDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, which: 'resize-start' | 'resize-end') => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { type: which };
    },
    [],
  );

  const onRangeDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (anchor.kind !== 'segment') return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        type: 'move-segment',
        offset: timeFromEvent(e.clientX) - anchor.start,
      };
    },
    [anchor, timeFromEvent],
  );

  const pct = (seconds: number) => (clamp(seconds) / safeDuration) * 100;

  // Faint markers for existing review snapshots/segments, as a reference while picking.
  const referenceMarks = reviews
    .map((review) => {
      const start = parseTimeSpanToSeconds(review.timestamp);
      if (start == null) return null;
      const dur = parseTimeSpanToSeconds(review.duration);
      return dur != null && dur > 0 ? { start, end: start + dur } : { start, end: null };
    })
    .filter((mark): mark is { start: number; end: number | null } => mark !== null);

  return (
    <div className="vr-anchor">
      <div
        ref={trackRef}
        className="vr-anchor-track"
        onPointerDown={onTrackDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="vr-anchor-inner">
          {showReferenceMarks &&
            referenceMarks.map((mark, i) =>
              mark.end != null ? (
                <div
                  key={i}
                  className="vr-anchor-ref vr-anchor-ref-segment"
                  style={{
                    left: `${pct(mark.start)}%`,
                    width: `${pct(mark.end) - pct(mark.start)}%`,
                  }}
                />
              ) : (
                <div
                  key={i}
                  className="vr-anchor-ref vr-anchor-ref-dot"
                  style={{ left: `${pct(mark.start)}%` }}
                />
              ),
            )}
          {anchor.kind === 'segment' && (
            <>
              <div
                className="vr-anchor-range"
                style={{
                  left: `${pct(anchor.start)}%`,
                  width: `${pct(anchor.end) - pct(anchor.start)}%`,
                }}
                onPointerDown={onRangeDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              />
              <div
                className="vr-anchor-handle"
                style={{ left: `${pct(anchor.start)}%` }}
                onPointerDown={(e) => onHandleDown(e, 'resize-start')}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              />
              <div
                className="vr-anchor-handle"
                style={{ left: `${pct(anchor.end)}%` }}
                onPointerDown={(e) => onHandleDown(e, 'resize-end')}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              />
            </>
          )}
          {anchor.kind === 'snapshot' && (
            <div
              className="vr-anchor-dot"
              style={{ left: `${pct(anchor.time)}%` }}
              onPointerDown={onDotDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            />
          )}
        </div>
      </div>
    </div>
  );
}
