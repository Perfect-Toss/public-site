import './YouTubePlayer.css';

import {
  faCompress,
  faExpand,
  faPause,
  faPlay,
  faVolumeHigh,
  faVolumeXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useRef, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatClock } from '../../../utils/format';

/** The part of the YouTube IFrame Player API this player drives. */
interface YtPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  destroy(): void;
}

interface YtEvent {
  target: YtPlayer;
  data: number;
}

interface YtPlayerOptions {
  videoId: string;
  /** Omitted by the API means a fixed 640x390 iframe, which overflows a narrow card. */
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: YtEvent) => void;
    onStateChange?: (event: YtEvent) => void;
    onError?: () => void;
  };
}

interface YtApi {
  Player: new (element: HTMLElement, options: YtPlayerOptions) => YtPlayer;
  PlayerState: { PLAYING: number };
}

declare global {
  interface Window {
    YT?: YtApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = 'https://www.youtube.com/iframe_api';

let apiPromise: Promise<YtApi> | null = null;

/** Loads the IFrame Player API once and shares the promise across every card. */
function loadYouTubeApi(): Promise<YtApi> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YtApi>((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT as YtApi);
    };

    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement('script');
      script.src = API_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

export interface YouTubePlayerProps {
  videoId: string;
  /** Used for aria labels; the iframe's own title is set by YouTube. */
  title: string;
  poster: string;
}

/**
 * Plays a public YouTube video through our own chrome. YouTube's player runs
 * with `controls=0`, which drops its overlay, title and logo; the controls
 * below the video replace it. Captions are forced on.
 */
export function YouTubePlayer({ videoId, title, poster }: YouTubePlayerProps) {
  const [started, setStarted] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);

  // Build the player only once the poster is clicked, so a grid of drills
  // never loads YouTube's player until one is wanted.
  useEffect(() => {
    if (!started) return;
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;

    // YouTube replaces the element it is handed with its iframe, so it gets a
    // node React doesn't manage.
    const mount = document.createElement('div');
    host.appendChild(mount);

    loadYouTubeApi().then((api) => {
      if (cancelled) return;

      playerRef.current = new api.Player(mount, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          controls: 0,
          cc_load_policy: 1,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          disablekb: 1,
          fs: 0,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            setDuration(event.target.getDuration());
            event.target.playVideo();
          },
          onStateChange: (event) => {
            if (cancelled) return;
            const nowPlaying = event.data === api.PlayerState.PLAYING;
            setPlaying(nowPlaying);
            if (nowPlaying) setHasPlayed(true);
            setDuration((previous) => event.target.getDuration() || previous);
          },
          onError: () => {
            if (!cancelled) setFailed(true);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // The player never finished initialising, so there is nothing to tear down.
      }
      playerRef.current = null;
      mount.remove();
    };
  }, [started, videoId]);

  // Poll for the scrub bar — the IFrame API has no timeupdate event to hook.
  useEffect(() => {
    if (!started || failed) return;
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      setCurrentTime(player.getCurrentTime());
      const total = player.getDuration();
      if (total) setDuration(total);
    }, 250);
    return () => window.clearInterval(id);
  }, [started, failed]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /** Mounts the player on the first click, then retries playback if a browser
   *  blocked it — the second click is a fresh gesture, which unblocks it. */
  const startPlayback = () => {
    if (!started) {
      setStarted(true);
      return;
    }
    playerRef.current?.playVideo();
  };

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isMuted()) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  };

  const seek = (seconds: number) => {
    setCurrentTime(seconds);
    playerRef.current?.seekTo(seconds, true);
  };

  const toggleFullscreen = () => {
    const root = rootRef.current;
    if (!root) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.requestFullscreen();
  };

  return (
    <div ref={rootRef} className={`ytp-root${hasPlayed && !playing ? ' is-paused' : ''}`}>
      <div className="ytp-media">
        <div ref={hostRef} className="ytp-host" />

        {/*
          Sits over the iframe and swallows pointer events, so YouTube never
          draws its hover chrome (title, channel, logo). Clicking plays/pauses.
        */}
        {hasPlayed && !failed && (
          <button
            type="button"
            className="ytp-shield"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
          />
        )}

        {/* Covers YouTube's own poster until playback actually starts. */}
        {!hasPlayed && !failed && (
          <button
            type="button"
            className="ytp-poster-btn"
            onClick={startPlayback}
            aria-label={`Play ${title}`}
          >
            <img className="ytp-poster" src={poster} alt="" loading="lazy" />
            <span className="ytp-play-disc">
              <FontAwesomeIcon icon={faPlay} />
            </span>
          </button>
        )}

        {hasPlayed && !failed && (
          <div className="ytp-controls">
            <button
              type="button"
              className="ytp-btn"
              onClick={togglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              <FontAwesomeIcon icon={playing ? faPause : faPlay} />
            </button>

            <span className="ytp-time">
              {formatClock(currentTime)} / {formatClock(duration)}
            </span>

            <input
              className="ytp-scrub"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Seek"
            />

            <button
              type="button"
              className="ytp-btn"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              <FontAwesomeIcon icon={muted ? faVolumeXmark : faVolumeHigh} />
            </button>

            <button
              type="button"
              className="ytp-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            >
              <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
            </button>
          </div>
        )}
      </div>

      {failed && (
        <p className="ytp-error">
          This drill can’t be played here.{' '}
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">
            Watch it on YouTube
          </a>
          .
        </p>
      )}
    </div>
  );
}
