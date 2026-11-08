import './VideoReviewsPanel.css';

import { faClock, faMicrophone, faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, type ReactNode } from 'react';
import type { VideoReview } from '../../api/api.videos';
import { formatClock } from '../../utils/format';
import { UserInfo } from '../common';
import { positionText } from './reviewLabels';
import {
  primeReviewAudio,
  seekReviewAudio,
  toggleReviewAudio,
  useReviewAudioPlayer,
  useReviewContentUrl,
} from './reviewContent';

export interface VideoReviewDetailsProps {
  videoId?: string | null;
  review: VideoReview;
  /** Avatar/name size — the marker preview is a little larger than a list row. */
  size?: number;
  /** Consumer-specific affordances (e.g. the list's created time + delete button). */
  trailing?: ReactNode;
  /** Render the recording with a player; the hover preview only labels it. */
  audioPlayer?: boolean;
}

/**
 * ONE rendering of a review. The marker preview and the review list both use it,
 * so the same review always reads the same way wherever it appears.
 */
export function VideoReviewDetails({
  videoId,
  review,
  size = 24,
  trailing,
  audioPlayer = false,
}: VideoReviewDetailsProps) {
  const { url: contentUrl, onError: onContentError } = useReviewContentUrl(videoId, review);
  const pos = positionText(review);
  // An audio item carries no text of its own — its transcript stands in for it.
  const body = review.text ?? review.transcript ?? null;
  const isAudio = review.contentKind === 'Audio';
  // Playback state comes from the ONE shared review player (the same element the
  // marker click drives), so this control never starts a second download.
  const audioState = useReviewAudioPlayer(videoId, review.id);

  // Preload just the clip's metadata so the clock and seek bar are usable before
  // the note is played; the full download still happens on play.
  useEffect(() => {
    if (audioPlayer && isAudio && videoId) primeReviewAudio(videoId, review.id);
  }, [audioPlayer, isAudio, videoId, review.id]);

  return (
    <div className="vr-details">
      <div className="vr-details-head">
        <UserInfo user={review.createdByUser ?? {}} size={size} />
        {pos && (
          <span className="vr-details-pos">
            <FontAwesomeIcon icon={faClock} />
            {pos}
          </span>
        )}
        {trailing}
      </div>

      {body && <p className="vr-details-text">{body}</p>}

      {isAudio && !audioPlayer && (
        <span className="vr-details-kind">
          <FontAwesomeIcon icon={faMicrophone} />
          Voice note
        </span>
      )}
      {isAudio && audioPlayer && (
        <div className="vr-audio" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`vr-audio-play${audioState.playing ? ' playing' : ''}`}
            onClick={() => {
              if (videoId) void toggleReviewAudio(videoId, review.id);
            }}
            aria-label={audioState.playing ? 'Pause voice note' : 'Play voice note'}
            title={audioState.playing ? 'Pause voice note' : 'Play voice note'}
          >
            <FontAwesomeIcon icon={audioState.playing ? faPause : faPlay} />
          </button>
          <input
            type="range"
            className="vr-audio-seek"
            min={0}
            max={audioState.duration || 0}
            step="0.1"
            value={Math.min(audioState.currentTime, audioState.duration || 0)}
            disabled={!audioState.duration}
            onChange={(e) => {
              if (videoId) seekReviewAudio(videoId, review.id, Number(e.target.value));
            }}
            aria-label="Seek voice note"
          />
          <span className="vr-audio-time">
            {formatClock(audioState.currentTime)} /{' '}
            {audioState.duration ? formatClock(audioState.duration) : '--:--'}
          </span>
        </div>
      )}

      {review.contentKind === 'Drawing' && contentUrl && (
        <img
          className="vr-details-drawing"
          src={contentUrl}
          alt="Review drawing"
          onError={onContentError}
        />
      )}
    </div>
  );
}
