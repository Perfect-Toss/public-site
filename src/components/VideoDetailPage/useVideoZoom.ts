import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
} from 'react';

/** Picture transform: `translate(x, y) scale(scale)` with a top-left origin. */
export interface ZoomState {
  scale: number;
  x: number;
  y: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
const IDENTITY: ZoomState = { scale: 1, x: 0, y: 0 };
/** Movement (px) before a press counts as a pan rather than a click. */
const DRAG_THRESHOLD = 4;
/** Zoom per wheel pixel (Ctrl/⌘ + scroll, and trackpad pinch in Chrome/Firefox/Edge). */
const WHEEL_ZOOM_RATE = 0.01;
/** Step for the keyboard / button zoom. */
export const ZOOM_STEP = 1.25;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Keep the scale in range and the zoomed picture covering the stage (no gaps at the edges). */
export function clampZoom(z: ZoomState, width: number, height: number): ZoomState {
  const scale = clamp(z.scale, MIN_ZOOM, MAX_ZOOM);
  if (scale === MIN_ZOOM) return IDENTITY;
  return {
    scale,
    x: clamp(z.x, width - width * scale, 0),
    y: clamp(z.y, height - height * scale, 0),
  };
}

/** Zoom to `scale`, keeping the stage point (px, py) fixed under the pointer. */
export function zoomAt(
  z: ZoomState,
  scale: number,
  px: number,
  py: number,
  width: number,
  height: number,
): ZoomState {
  const next = clamp(scale, MIN_ZOOM, MAX_ZOOM);
  const k = next / z.scale;
  return clampZoom({ scale: next, x: px - (px - z.x) * k, y: py - (py - z.y) * k }, width, height);
}

/** Safari's trackpad pinch: non-standard `gesture*` events carrying a cumulative scale. */
type GestureEvent = Event & { scale: number; clientX: number; clientY: number };

/**
 * Zoom and pan for the video picture only, never the page:
 * - trackpad pinch / Ctrl(⌘) + scroll zooms at the pointer (the page-zoom
 *   default is cancelled anywhere over the player);
 * - touch pinch zooms at the fingers' midpoint;
 * - while zoomed, dragging or plain scrolling over the picture pans it.
 *
 * `stageRef` is the clipped box the picture fills; `surfaceRef` is the whole
 * player, so a pinch over the controls zooms the video instead of the page.
 */
export function useVideoZoom(
  stageRef: RefObject<HTMLElement | null>,
  surfaceRef: RefObject<HTMLElement | null>,
) {
  const [zoom, setZoom] = useState<ZoomState>(IDENTITY);
  const zoomRef = useRef(zoom);

  const apply = useCallback((next: ZoomState) => {
    const prev = zoomRef.current;
    if (prev.scale === next.scale && prev.x === next.x && prev.y === next.y) return;
    zoomRef.current = next;
    setZoom(next);
  }, []);

  /** Zoom to an absolute scale around a client point (default: the stage centre). */
  const zoomTo = useCallback(
    (scale: number, clientX?: number, clientY?: number) => {
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = clientX == null ? rect.width / 2 : clientX - rect.left;
      const py = clientY == null ? rect.height / 2 : clientY - rect.top;
      apply(zoomAt(zoomRef.current, scale, px, py, rect.width, rect.height));
    },
    [apply, stageRef],
  );

  const zoomBy = useCallback(
    (factor: number, clientX?: number, clientY?: number) =>
      zoomTo(zoomRef.current.scale * factor, clientX, clientY),
    [zoomTo],
  );

  const reset = useCallback(() => apply(IDENTITY), [apply]);

  /** Pan by a screen-space delta, kept inside the picture. */
  const panBy = useCallback(
    (dx: number, dy: number) => {
      const el = stageRef.current;
      const z = zoomRef.current;
      if (!el || z.scale === 1) return;
      apply(clampZoom({ ...z, x: z.x + dx, y: z.y + dy }, el.clientWidth, el.clientHeight));
    },
    [apply, stageRef],
  );

  // Wheel and Safari gestures need non-passive native listeners: React's
  // wheel handler is passive, so it can't stop the browser zooming the page.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const onWheel = (e: WheelEvent) => {
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch arrives as Ctrl + wheel in Chrome, Edge and Firefox.
        e.preventDefault();
        const dy = clamp(e.deltaY * unit, -50, 50);
        zoomBy(Math.exp(-dy * WHEEL_ZOOM_RATE), e.clientX, e.clientY);
        return;
      }
      // Plain scroll pans a zoomed picture; otherwise the page scrolls as usual.
      const stage = stageRef.current;
      const z = zoomRef.current;
      if (z.scale === 1 || !stage?.contains(e.target as Node)) return;
      const next = clampZoom(
        { ...z, x: z.x - e.deltaX * unit, y: z.y - e.deltaY * unit },
        stage.clientWidth,
        stage.clientHeight,
      );
      // Already at the picture's edge in the scroll direction: don't eat the
      // scroll — let it carry on to the page.
      if (next.x === z.x && next.y === z.y) return;
      e.preventDefault();
      apply(next);
    };

    let gestureBase = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gestureBase = zoomRef.current.scale;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as GestureEvent;
      zoomTo(gestureBase * g.scale, g.clientX, g.clientY);
    };
    const onGestureEnd = (e: Event) => e.preventDefault();

    surface.addEventListener('wheel', onWheel, { passive: false });
    surface.addEventListener('gesturestart', onGestureStart);
    surface.addEventListener('gesturechange', onGestureChange);
    surface.addEventListener('gestureend', onGestureEnd);
    return () => {
      surface.removeEventListener('wheel', onWheel);
      surface.removeEventListener('gesturestart', onGestureStart);
      surface.removeEventListener('gesturechange', onGestureChange);
      surface.removeEventListener('gestureend', onGestureEnd);
    };
  }, [surfaceRef, stageRef, zoomBy, zoomTo, apply]);

  // ── Pointers: touch pinch, and drag-to-pan while zoomed ──────────────
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number; mid: { x: number; y: number } } | null>(
    null,
  );
  const press = useRef<{ x: number; y: number } | null>(null);
  /** The current press panned or pinched, so the click it ends in must not toggle play. */
  const dragged = useRef(false);

  const pinchFrame = () => {
    const [a, b] = [...pointers.current.values()];
    return {
      dist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  };

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      press.current = { x: e.clientX, y: e.clientY };
      dragged.current = false;
    } else if (pointers.current.size === 2) {
      const frame = pinchFrame();
      pinch.current = { dist: frame.dist, scale: zoomRef.current.scale, mid: frame.mid };
      dragged.current = true;
    }
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const p = pinch.current;
      if (p && pointers.current.size >= 2) {
        const frame = pinchFrame();
        zoomTo((p.scale * frame.dist) / p.dist, frame.mid.x, frame.mid.y);
        panBy(frame.mid.x - p.mid.x, frame.mid.y - p.mid.y);
        p.mid = frame.mid;
        return;
      }

      const start = press.current;
      if (!start || zoomRef.current.scale === 1) return;
      if (!dragged.current) {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) <= DRAG_THRESHOLD) return;
        dragged.current = true;
        // Capture only once it's a drag: capturing on press would retarget the
        // release and swallow ordinary clicks (play/pause) on the video.
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      panBy(e.clientX - prev.x, e.clientY - prev.y);
    },
    [panBy, zoomTo],
  );

  const onPointerEnd = useCallback((e: PointerEvent<HTMLElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) press.current = null;
  }, []);

  /** True when the click that just fired ended a pan or pinch (and should be ignored). */
  const wasDrag = useCallback(() => dragged.current, []);

  const zoomed = zoom.scale > 1;

  const pictureStyle: CSSProperties | undefined = zoomed
    ? {
        transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
        transformOrigin: '0 0',
      }
    : undefined;

  const stageStyle: CSSProperties = {
    // Zoomed: every touch is ours (pan/pinch). Unzoomed: one finger still
    // scrolls the page, but the browser's own pinch-zoom is off.
    touchAction: zoomed ? 'none' : 'pan-y',
    cursor: zoomed ? 'grab' : undefined,
  };

  return {
    zoom,
    zoomed,
    zoomBy,
    reset,
    wasDrag,
    pictureStyle,
    stageStyle,
    stageHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
