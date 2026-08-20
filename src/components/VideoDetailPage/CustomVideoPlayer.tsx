import './CustomVideoPlayer.css';

import {
  faCircleQuestion,
  faCompress,
  faEllipsisVertical,
  faExpand,
  faGaugeHigh,
  faKeyboard,
  faPause,
  faPlay,
  faRepeat,
  faVolumeHigh,
  faVolumeLow,
  faVolumeXmark,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { VideoReview } from '../../api/api.videos';
import { AnchorPicker, type ReviewAnchor } from './ReviewAnchorPicker';
import { VideoDrawingOverlay } from './VideoDrawingOverlay';
import { VideoReviewComposer } from './VideoReviewComposer';
import { VideoTimeline } from './VideoTimeline';
import { buildVideoAnchors, formatPosition } from './videoTime';

export interface CustomVideoPlayerProps {
  videoUrl: string;
  poster?: string;
  reviews: VideoReview[];
  /** Fallback duration (seconds) from metadata before the video loads. */
  durationFallback: number;
  /** Optional content rendered in the auto-hiding top overlay. */
  topBar?: ReactNode;
  /** Currently selected review id (drives the active timeline marker highlight). */
  activeReviewId?: string | null;
  /**
   * Monotonic counter bumped on every review selection. Combined with
   * `activeReviewId` so re-selecting the same review still re-seeks/re-loops.
   */
  selectNonce?: number;
  /** Called when a review is selected (seek + segment looping handled internally). */
  onSelectReview?: (reviewId: string) => void;
  /** Video id — enables the inline "add review" button in the controls. */
  videoId?: string;
  /** Called after an inline review is added (parent refreshes the review list). */
  onAdded?: () => void | Promise<void>;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'Space', label: 'Play / pause' },
  { keys: '← / →', label: 'Frame step (1/30s)' },
  { keys: 'Ctrl + ← / →', label: 'Back / forward 1s' },
  { keys: 'Shift + ← / →', label: 'Back / forward 5s' },
  { keys: '↑ / ↓', label: 'Previous / next review' },
  { keys: 'M', label: 'Mute / unmute' },
  { keys: 'F', label: 'Fullscreen' },
  { keys: 'A', label: 'Add review' },
];

/** Format seconds as "m:ss" or "h:mm:ss". */
function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Fully custom video player chrome (no native controls). From top to bottom:
 * review-marker timeline, draggable seek bar, and the controls row
 * (play, time, volume, fullscreen, menu).
 */
export const CustomVideoPlayer = forwardRef<HTMLVideoElement, CustomVideoPlayerProps>(
  function CustomVideoPlayer(
    {
      videoUrl,
      poster,
      reviews,
      durationFallback,
      topBar,
      activeReviewId,
      selectNonce,
      onSelectReview,
      videoId,
      onAdded,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const scrubRef = useRef<HTMLDivElement>(null);
    const scrubbingRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [menuOpen, setMenuOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    /** Segment bounds currently being looped (null when not looping). */
    const [loopRange, setLoopRange] = useState<{ start: number; end: number } | null>(null);
    const loopRangeRef = useRef<{ start: number; end: number } | null>(null);
    /** Inline compose overlay is open (text/audio or drawing). */
    const [addOpen, setAddOpen] = useState(false);
    /** True while the full-video drawing overlay is active. */
    const [drawingMode, setDrawingMode] = useState(false);
    /** Anchor the inline composer starts with (seeded at the current playhead). */
    const [addAnchor, setAddAnchor] = useState<ReviewAnchor>({ kind: 'none' });

    const setVideoRef = useCallback(
      (node: HTMLVideoElement | null) => {
        videoRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const safeDuration = duration || durationFallback;

    // Keep a ref mirror of the loop range so the (stable) video event
    // listeners can read it without re-binding on every change.
    useEffect(() => {
      loopRangeRef.current = loopRange;
    }, [loopRange]);

    // ── Video events ────────────────────────────────────────────────────
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      const onTime = () => {
        const t = video.currentTime || 0;
        setCurrentTime(t);
        // Wrap back to the segment start while the video is looping over it.
        const loop = loopRangeRef.current;
        if (loop && !video.paused && t >= loop.end) {
          video.currentTime = loop.start;
          setCurrentTime(loop.start);
        }
      };
      const onLoaded = () => setDuration(video.duration || 0);
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onEnded = () => {
        setIsPlaying(false);
        // A looping segment that reached the real end of the video: replay it.
        const loop = loopRangeRef.current;
        if (loop) {
          video.currentTime = loop.start;
          setCurrentTime(loop.start);
          void video.play();
        }
      };
      const onVolume = () => {
        setVolume(video.volume);
        setMuted(video.muted);
      };
      video.addEventListener('timeupdate', onTime);
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('durationchange', onLoaded);
      video.addEventListener('play', onPlay);
      video.addEventListener('pause', onPause);
      video.addEventListener('ended', onEnded);
      video.addEventListener('volumechange', onVolume);
      onLoaded();
      onVolume();
      return () => {
        video.removeEventListener('timeupdate', onTime);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('durationchange', onLoaded);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('volumechange', onVolume);
      };
    }, [videoUrl]);

    const togglePlay = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) void video.play();
      else video.pause();
    }, []);

    // ── Inline compose overlay ─────────────────────────────────────
    const openComposer = useCallback(() => {
      setAddOpen(true);
      // Seed the anchor at the current playhead if none is set yet, so a
      // snapshot/segment starts from where the reviewer is looking.
      setAddAnchor((prev) =>
        prev.kind === 'none'
          ? { kind: 'snapshot', time: videoRef.current?.currentTime ?? currentTime }
          : prev,
      );
    }, [currentTime]);

    const closeAddReview = useCallback(() => {
      setAddOpen(false);
      setDrawingMode(false);
      // Return keyboard focus to the player so shortcuts work again.
      containerRef.current?.focus({ preventScroll: true });
    }, []);

    /** Return from the drawing overlay to the compose bar. */
    const goBackToCompose = useCallback(() => {
      setDrawingMode(false);
    }, []);

    /** A drawing review was submitted: close everything and refresh. */
    const handleDrawingAdded = useCallback(() => {
      setAddOpen(false);
      setDrawingMode(false);
      void onAdded?.();
    }, [onAdded]);

    /**
     * Shared anchor change handler for the always-visible anchor control.
     * Updates the anchor only — the compose overlay opens on commit (pointer
     * up) so a segment can be dragged out first.
     */
    const handleAnchorChange = useCallback((next: ReviewAnchor) => {
      setAddAnchor(next);
    }, []);

    /** Open the compose overlay once an anchor gesture is committed. */
    const handleAnchorCommit = useCallback(
      (committed: ReviewAnchor) => {
        if (committed.kind !== 'none' && !addOpen) setAddOpen(true);
      },
      [addOpen],
    );

    // ── Scrubbing ───────────────────────────────────────────────────────
    const handleSeek = useCallback(
      (clientX: number) => {
        const video = videoRef.current;
        const track = scrubRef.current;
        if (!video || !track) return;
        const rect = track.getBoundingClientRect();
        if (rect.width <= 0) return;
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const target = ratio * safeDuration;
        video.currentTime = target;
        setCurrentTime(video.currentTime || target);
      },
      [safeDuration],
    );

    const onScrubDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        scrubbingRef.current = true;
        handleSeek(e.clientX);
      },
      [handleSeek],
    );

    const onScrubMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!scrubbingRef.current) return;
        handleSeek(e.clientX);
      },
      [handleSeek],
    );

    const onScrubUp = useCallback(() => {
      scrubbingRef.current = false;
    }, []);

    // ── Keyboard editing shortcuts ────────────────────────────────────
    /** Seek by `delta` seconds (clamped to the video bounds). */
    const step = useCallback(
      (delta: number) => {
        const video = videoRef.current;
        if (!video || !Number.isFinite(safeDuration) || safeDuration <= 0) return;
        const target = Math.min(safeDuration, Math.max(0, video.currentTime + delta));
        video.currentTime = target;
        setCurrentTime(target);
      },
      [safeDuration],
    );

    const anchors = useMemo(() => buildVideoAnchors(reviews), [reviews]);

    /** Index of the anchor at or just before the current playback position. */
    const positionAnchorIndex = useCallback(() => {
      const t = videoRef.current?.currentTime ?? currentTime;
      let idx = -1;
      for (let i = 0; i < anchors.length; i++) {
        if (anchors[i].start <= t) idx = i;
      }
      return idx;
    }, [anchors, currentTime]);

    /**
     * React to the selected review (timeline marker, keyboard nav, or the
     * review list): seek to its position. Segment reviews (start + end) loop
     * the video between those bounds; snapshot/general notes just jump and
     * clear the loop.
     */
    useEffect(() => {
      if (!activeReviewId) return;
      const anchor = anchors.find((a) => a.id === activeReviewId);
      const video = videoRef.current;
      if (!anchor || !video) return;
      if (anchor.end != null) {
        loopRangeRef.current = { start: anchor.start, end: anchor.end };
        setLoopRange(loopRangeRef.current);
      } else {
        loopRangeRef.current = null;
        setLoopRange(null);
      }
      video.currentTime = anchor.start;
      setCurrentTime(anchor.start);
      // Looping a segment implies replaying it from the start.
      if (anchor.end != null) void video.play();
      // Return keyboard focus to the player so shortcuts (e.g. Space) toggle
      // play/pause instead of re-triggering the clicked review control.
      containerRef.current?.focus({ preventScroll: true });
    }, [activeReviewId, selectNonce, anchors]);

    /**
     * Select a review from the timeline: seek/loop to it (the effect above),
     * and — when not already composing — anchor a new review at the same spot
     * and open the review-type picker so the user can add to that moment.
     */
    const selectAnchor = useCallback(
      (id: string) => {
        onSelectReview?.(id);
        const anchor = anchors.find((a) => a.id === id);
        if (!anchor) return;
        setAddAnchor(
          anchor.end != null
            ? { kind: 'segment', start: anchor.start, end: anchor.end }
            : { kind: 'snapshot', time: anchor.start },
        );
        setAddOpen(true);
      },
      [onSelectReview, anchors],
    );

    /** Step to the previous (-1) or next (+1) review anchor. */
    const stepReview = useCallback(
      (dir: 1 | -1) => {
        if (anchors.length === 0) return;
        const activeIdx =
          activeReviewId != null && anchors.some((a) => a.id === activeReviewId)
            ? anchors.findIndex((a) => a.id === activeReviewId)
            : positionAnchorIndex();
        let next = activeIdx >= 0 ? activeIdx + dir : dir === 1 ? 0 : anchors.length - 1;
        // Wrap around so up/down cycle through the reviews instead of stopping.
        next = ((next % anchors.length) + anchors.length) % anchors.length;
        selectAnchor(anchors[next].id);
      },
      [anchors, activeReviewId, positionAnchorIndex, selectAnchor],
    );

    // Focus the player so keyboard shortcuts work right away.
    useEffect(() => {
      containerRef.current?.focus();
    }, [videoUrl]);

    // ── Fullscreen ──────────────────────────────────────────────────────
    const toggleFullscreen = useCallback(() => {
      const el = containerRef.current;
      if (!el) return;
      if (document.fullscreenElement) void document.exitFullscreen();
      else void el.requestFullscreen?.();
    }, []);

    useEffect(() => {
      const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
      document.addEventListener('fullscreenchange', onChange);
      return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    // ── Volume / menu ───────────────────────────────────────────────────
    const changeVolume = useCallback((value: number) => {
      const video = videoRef.current;
      if (!video) return;
      const v = Math.min(1, Math.max(0, value));
      video.volume = v;
      video.muted = v === 0;
      setVolume(v);
      setMuted(v === 0);
    }, []);

    const toggleMute = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = !video.muted;
    }, []);

    const applyRate = useCallback((rate: number) => {
      const video = videoRef.current;
      if (video) video.playbackRate = rate;
      setPlaybackRate(rate);
      setMenuOpen(false);
    }, []);

    const togglePictureInPicture = useCallback(async () => {
      const video = videoRef.current;
      if (!video) return;
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture?.();
        }
      } catch {
        // unsupported / rejected — ignore
      } finally {
        setMenuOpen(false);
      }
    }, []);

    // Editing shortcuts. Only fires when the player container (not an inner
    // input/button) has focus, so typing and modal keys aren't hijacked.
    const handlePlayerKey = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        if (!video) return;
        // Let inputs/textareas/selects/buttons handle their own keys.
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;

        const isSpace = e.key === ' ' || e.code === 'Space';
        if (isSpace) {
          e.preventDefault();
          togglePlay();
          return;
        }

        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            step(e.ctrlKey || e.metaKey ? -1 : e.shiftKey ? -5 : -1 / 30);
            break;
          case 'ArrowRight':
            e.preventDefault();
            step(e.ctrlKey || e.metaKey ? 1 : e.shiftKey ? 5 : 1 / 30);
            break;
          case 'ArrowUp':
            e.preventDefault();
            stepReview(1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            stepReview(-1);
            break;
          case 'm':
          case 'M':
            toggleMute();
            break;
          case 'f':
          case 'F':
            toggleFullscreen();
            break;
          case 'a':
          case 'A':
            e.preventDefault();
            if (addOpen) closeAddReview();
            else openComposer();
            break;
          case 'Escape':
            e.preventDefault();
            closeAddReview();
            break;
        }
      },
      [
        step,
        stepReview,
        togglePlay,
        toggleMute,
        toggleFullscreen,
        addOpen,
        openComposer,
        closeAddReview,
      ],
    );

    const pipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;

    /** Any compose overlay (text/audio/drawing) replaces the chrome. */
    const composingActive = addOpen;
    /** Drawing mode renders the full-video drawing overlay. */
    const drawingActive = composingActive && drawingMode;

    const volumeIcon =
      muted || volume === 0 ? faVolumeXmark : volume < 0.5 ? faVolumeLow : faVolumeHigh;
    const progressPct = safeDuration > 0 ? Math.min(100, (currentTime / safeDuration) * 100) : 0;

    return (
      <div
        ref={containerRef}
        className="cvp-player"
        tabIndex={0}
        aria-label="Video player keyboard controls"
        onKeyDown={handlePlayerKey}
        onClick={() => containerRef.current?.focus()}
      >
        <video
          ref={setVideoRef}
          src={videoUrl}
          poster={poster}
          playsInline
          preload="metadata"
          className="cvp-video"
          onClick={togglePlay}
        />

        {topBar && !composingActive && (
          <div className="cvp-topbar" onClick={(e) => e.stopPropagation()}>
            {topBar}
          </div>
        )}

        {videoId && drawingActive && (
          <VideoDrawingOverlay
            videoId={videoId}
            videoElement={videoRef.current}
            anchor={addAnchor}
            onAnchorChange={handleAnchorChange}
            positionTime={currentTime}
            onClose={goBackToCompose}
            onAdded={handleDrawingAdded}
          />
        )}

        {videoId && composingActive && !drawingActive && (
          <VideoReviewComposer
            videoId={videoId}
            anchor={addAnchor}
            onAnchorChange={handleAnchorChange}
            onStartDrawing={() => setDrawingMode(true)}
            onClose={closeAddReview}
            onAdded={onAdded ?? (() => undefined)}
          />
        )}

        <div
          className={`cvp-chrome${composingActive ? ' cvp-overlay-mode' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Always-visible anchor control: set a snapshot/segment at any time. */}
          {videoId && (
            <div className="cvp-anchor-row">
              <div className="cvp-anchor-row-head">
                {addAnchor.kind === 'none' ? (
                  <span className="cvp-anchor-row-hint">
                    Tap to set a snapshot · Drag to select a segment
                  </span>
                ) : (
                  <span className="cvp-anchor-row-value">
                    {addAnchor.kind === 'snapshot'
                      ? `Snapshot @ ${formatPosition(addAnchor.time)}`
                      : `Segment ${formatPosition(addAnchor.start)} – ${formatPosition(addAnchor.end)}`}
                  </span>
                )}
              </div>
              <AnchorPicker
                duration={safeDuration}
                reviews={reviews}
                showReferenceMarks={false}
                anchor={addAnchor}
                onChange={handleAnchorChange}
                onCommit={handleAnchorCommit}
              />
            </div>
          )}

          <div className="cvp-timeline-stack">
            <VideoTimeline
              reviews={reviews}
              duration={safeDuration}
              activeReviewId={activeReviewId}
              onSelectReview={selectAnchor}
            />

            <div
              ref={scrubRef}
              className="cvp-scrub"
              onPointerDown={onScrubDown}
              onPointerMove={onScrubMove}
              onPointerUp={onScrubUp}
              onPointerLeave={onScrubUp}
            >
              <div className="cvp-scrub-track">
                <div className="cvp-scrub-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            {/* One continuous position line spanning the review timeline + scrub. */}
            <div className="cvp-position-line" style={{ left: `${progressPct}%` }} />
          </div>

          <div className="cvp-controls">
            <button
              type="button"
              className="cvp-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </button>
            <span className="cvp-time">
              {formatClock(currentTime)} / {formatClock(safeDuration)}
              {loopRange && (
                <span
                  className="cvp-loop-badge"
                  title={`Looping ${formatClock(loopRange.start)} – ${formatClock(loopRange.end)}`}
                >
                  <FontAwesomeIcon icon={faRepeat} />
                  Loop
                </span>
              )}
            </span>

            <div className="cvp-spacer" />

            <div className="cvp-volume">
              <button
                type="button"
                className="cvp-btn"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                <FontAwesomeIcon icon={volumeIcon} />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((muted ? 0 : volume) * 100)}
                onChange={(e) => changeVolume(Number(e.target.value) / 100)}
                aria-label="Volume"
              />
            </div>

            <button
              type="button"
              className="cvp-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
            </button>

            <div
              className="cvp-menu-wrap"
              onMouseEnter={() => setHelpOpen(true)}
              onMouseLeave={() => setHelpOpen(false)}
              onFocus={() => setHelpOpen(true)}
              onBlur={() => setHelpOpen(false)}
            >
              <button
                type="button"
                className="cvp-btn"
                aria-label="Keyboard shortcuts"
                aria-expanded={helpOpen}
              >
                <FontAwesomeIcon icon={faCircleQuestion} />
              </button>
              {helpOpen && (
                <div className="cvp-help" role="tooltip">
                  <div className="cvp-menu-title">
                    <FontAwesomeIcon icon={faKeyboard} />
                    Keyboard shortcuts
                  </div>
                  {SHORTCUTS.map((s) => (
                    <div key={s.keys} className="cvp-help-row">
                      <span className="cvp-help-keys">{s.keys}</span>
                      <span className="cvp-help-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cvp-menu-wrap">
              <button
                type="button"
                className="cvp-btn"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Playback menu"
                aria-expanded={menuOpen}
              >
                <FontAwesomeIcon icon={faEllipsisVertical} />
              </button>
              {menuOpen && (
                <div className="cvp-menu">
                  <div className="cvp-menu-title">
                    <FontAwesomeIcon icon={faGaugeHigh} />
                    Playback speed
                  </div>
                  {PLAYBACK_RATES.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      className={`cvp-menu-item${playbackRate === rate ? ' active' : ''}`}
                      onClick={() => applyRate(rate)}
                    >
                      {rate === 1 ? 'Normal' : `${rate}×`}
                    </button>
                  ))}
                  {pipSupported && (
                    <button
                      type="button"
                      className="cvp-menu-item"
                      onClick={() => void togglePictureInPicture()}
                    >
                      Picture in picture
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
