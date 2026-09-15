import './VideoFilmstrip.css';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';

export interface VideoFilmstripProps {
  /** The tablet-generated filmstrip sprite (single row of frames). Null/absent → thin-bar fallback. */
  filmstripUrl?: string | null;
  /** Fallback duration (seconds) before metadata loads. */
  durationFallback: number;
  /** Current playhead (seconds) — drives the progress fill over the strip. */
  currentTime: number;
  /** Seek the player to a time (hover/drag scrubbing). */
  onSeek: (seconds: number) => void;
}

/** Landscape fallback until the sprite's real dimensions are measured. */
const FALLBACK_ASPECT = 16 / 9;
/** Tallest allowed bar; very tall (portrait) strips are center-cropped to stay bounded. */
const MAX_STRIP_HEIGHT = 64;
/** Height (px) of the thin scrub bar shown when no filmstrip is available. */
const THIN_BAR_HEIGHT = 6;

/**
 * Filmstrip scrubber. Displays the tablet-generated sprite (a single row of
 * evenly-spaced frames) as the scrub bar. The sprite is measured CLIENT-SIDE
 * (plain image load → `naturalWidth`/`naturalHeight`; no canvas, no CORS, no
 * server-provided dimensions) so the bar keeps the sprite's real aspect ratio
 * (portrait videos → taller bar). Hovering/dragging seeks the player to that
 * position — the video itself is the preview, no hover bubble.
 *
 * Falls back to a thin scrub bar when there's no filmstrip (older uploads)
 * or the sprite fails to load.
 */
export function VideoFilmstrip({
  filmstripUrl,
  durationFallback,
  currentTime,
  onSeek,
}: VideoFilmstripProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [trackWidth, setTrackWidth] = useState(0);
  const [sprite, setSprite] = useState<{ width: number; height: number } | null>(null);

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

  // Hover/drag scrubbing: seek the player to the pointer's time (no bubble).
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
      e.currentTarget.setPointerCapture(e.pointerId);
      scrubAt(e.clientX);
    },
    [scrubAt],
  );

  // Size the bar from the sprite's measured aspect ratio; fall back to a thin
  // bar when no filmstrip is available (older uploads) or it fails to load.
  const aspect = sprite ? sprite.width / sprite.height : FALLBACK_ASPECT;
  const naturalHeight = trackWidth > 0 ? trackWidth / aspect : 0;
  const hasSprite = Boolean(sprite && filmstripUrl);
  const height = hasSprite ? Math.min(naturalHeight, MAX_STRIP_HEIGHT) : THIN_BAR_HEIGHT;

  return (
    <div
      ref={rootRef}
      className={`video-filmstrip${hasSprite ? '' : ' video-filmstrip--thin'}`}
      style={{ height }}
      role="slider"
      aria-label="Video scrubber"
      aria-valuemin={0}
      aria-valuemax={Math.round(durationFallback)}
      aria-valuenow={Math.round(currentTime)}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => scrubAt(e.clientX)}
    >
      {/* The tablet-generated sprite — whole strip scaled to the bar width. */}
      {hasSprite && filmstripUrl && (
        <div className="vf-sprite" style={{ backgroundImage: `url(${filmstripUrl})` }} />
      )}
    </div>
  );
}
