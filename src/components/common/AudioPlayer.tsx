import './AudioPlayer.css';

import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioPlayerProps {
  src: string;
  className?: string;
}

/** Format seconds as "m:ss". */
function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * A compact, app-styled audio player (play/pause + scrubbing + time). Uses a
 * hidden <audio> element for playback so the chrome matches the rest of the UI.
 */
export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Reset when the source changes.
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, []);

  const seek = useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(ev.target.value);
    audio.currentTime = next;
    setCurrentTime(next);
  }, []);

  const max = duration > 0 ? duration : 1;

  return (
    <div className={`audio-player${className ? ` ${className}` : ''}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
      />
      <button
        type="button"
        className="audio-player-toggle"
        onClick={toggle}
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
      </button>
      <span className="audio-player-time">{formatClock(currentTime)}</span>
      <input
        type="range"
        className="audio-player-scrub"
        min={0}
        max={max}
        step={0.05}
        value={Math.min(currentTime, max)}
        onChange={seek}
        aria-label="Audio position"
      />
      <span className="audio-player-time">{formatClock(duration)}</span>
    </div>
  );
}
