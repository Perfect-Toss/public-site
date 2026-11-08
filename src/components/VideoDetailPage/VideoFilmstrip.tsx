import './VideoFilmstrip.css';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';

export interface VideoFilmstripProps {
  /** The tablet-generated filmstrip sprite (single row of frames). Null/absent → thin-bar fallback. */
  filmstripUrl?: string | null;
  /** Fallback duration (seconds) before metadata loads. */
  durationFallback: number;
  /** Current playhead (seconds) — drives the playhead marker over the strip. */
  currentTime: number;
  /** Seek the player to a time (hover/drag scrubbing). */
  onSeek: (seconds: number) => void;
  /**
   * Video is playing. While it is, hovering must not yank playback around —
   * only an explicit press seeks.
   */
  isPlaying?: boolean;
  /** Overlay content drawn on top of the strip (e.g. the review markers). */
  children?: ReactNode;
}

/** Landscape fallback until the sprite's real dimensions are measured. */
const FALLBACK_ASPECT = 16 / 9;
/** Tallest allowed bar; very tall (portrait) strips are center-cropped to stay bounded. */
const MAX_STRIP_HEIGHT = 64;
/** Height (px) of the thin scrub bar shown when no filmstrip is available. */
const THIN_BAR_HEIGHT = 6;
/** Horizontal movement (px) before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 3;

/**
 * Filmstrip scrub bar. Displays the tablet-generated sprite (a single row of
 * evenly-spaced frames) as the scrub bar. The sprite is measured CLIENT-SIDE
 * (plain image load → `naturalWidth`/`naturalHeight`; no canvas, no CORS, no
 * server-provided dimensions) so the bar keeps the sprite's real aspect ratio
 * (portrait videos → taller bar). The video itself is the preview, no bubble.
 *
 * Scrub contract:
 * - time maps 1:1 across the FULL bar width, so the playhead sits exactly under
 *   the pointer at every position (no gutter at either end);
 * - hovering seeks while the video is paused;
 * - while the video is playing, hovering never moves it — only a click/press.
 *
 * Review markers are drawn over the strip through `children`, so the review bar
 * and the scrubber are one control.
 *
 * Falls back to a thin scrub bar when there's no filmstrip (older uploads)
 * or the sprite fails to load.
 */
export function VideoFilmstrip({
  filmstripUrl,
  durationFallback,
  currentTime,
  onSeek,
  isPlaying = false,
  children,
}: VideoFilmstripProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [trackWidth, setTrackWidth] = useState(0);
  const [sprite, setSprite] = useState<{ width: number; height: number } | null>(null);
  /** Pointer press in progress, used to tell a scrub drag from a click. */
  const pressRef = useRef<{ startX: number; captured: boolean } | null>(null);

  // Measure the bar width once and on every resize (resizes with the screen).
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setTrackWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load the sprite and measure its natural dimensions client-side. A plain
  // image load — no canvas, no CORS requirement, no server fields needed.
  useEffect(() => {
    setSprite(null);
    if (!filmstripUrl) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setSprite({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.src = filmstripUrl;
    return () => {
      cancelled = true;
    };
  }, [filmstripUrl]);

  // Scrub: the pointer maps straight onto the bar's full width, so the time we
  // seek to is exactly the time drawn under the cursor.
  const scrubAt = useCallback(
    (clientX: number) => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(ratio * durationFallback);
    },
    [durationFallback, onSeek],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      pressRef.current = { startX: e.clientX, captured: false };
      // A press always seeks, whether the video is playing or paused.
      scrubAt(e.clientX);
    },
    [scrubAt],
  );

  /**
   * Hover seeks only while paused. Once a press turns into a drag, keep seeking
   * (and take pointer capture then, not on pointerdown — capturing up front
   * would retarget the release and swallow clicks on the review markers drawn
   * over the bar).
   */
  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const press = pressRef.current;
      if (!press && isPlaying) return;
      if (press && !press.captured && Math.abs(e.clientX - press.startX) > DRAG_THRESHOLD) {
        press.captured = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      scrubAt(e.clientX);
    },
    [isPlaying, scrubAt],
  );

  const endPress = useCallback(() => {
    pressRef.current = null;
  }, []);

  // Size the bar from the sprite's measured aspect ratio; fall back to a thin
  // bar when no filmstrip is available (older uploads) or it fails to load.
  const aspect = sprite ? sprite.width / sprite.height : FALLBACK_ASPECT;
  const naturalHeight = trackWidth > 0 ? trackWidth / aspect : 0;
  const hasSprite = Boolean(sprite && filmstripUrl);
  const height = hasSprite ? Math.min(naturalHeight, MAX_STRIP_HEIGHT) : THIN_BAR_HEIGHT;

  // Playhead: same 1:1 mapping as the pointer, as a percentage of the full bar.
  const progress =
    durationFallback > 0 ? Math.min(1, Math.max(0, currentTime / durationFallback)) : 0;
  const playheadLeft = `${progress * 100}%`;

  return (
    <div
      ref={rootRef}
      className={`video-filmstrip${hasSprite ? '' : ' video-filmstrip--thin'}`}
      style={{ minHeight: height }}
      role="slider"
      aria-label="Video scrubber and review timeline"
      aria-valuemin={0}
      aria-valuemax={Math.round(durationFallback)}
      aria-valuenow={Math.round(currentTime)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPress}
      onPointerCancel={endPress}
    >
      <div className="vf-clip">
        {/* The tablet-generated sprite — whole strip scaled to the bar width. */}
        {hasSprite && filmstripUrl && (
          <div className="vf-sprite" style={{ backgroundImage: `url(${filmstripUrl})` }} />
        )}
      </div>

      {/* In flow at the bottom of the bar: the review lanes grow the bar upward
          instead of spilling over the controls above it. */}
      <div className="vf-overlay">{children}</div>

      <div className="vf-playhead" style={{ left: playheadLeft }} />
    </div>
  );
}
