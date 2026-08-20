import './VideoReviewsPanel.css';

import {
  faMicrophone,
  faPen,
  faPlus,
  faSpinner,
  faStop,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addVideoReview, type AddVideoReviewRequest } from '../../api/api.videos';
import { toDataUrl } from './reviewLabels';
import type { ReviewAnchor } from './ReviewAnchorPicker';
import { useVoiceRecorder } from './useVoiceRecorder';
import { toTimeSpan } from './videoTime';

export interface VideoReviewComposerProps {
  videoId: string;
  /**
   * Anchor the composer starts with (used when the caller does not control the
   * anchor via `anchor`/`onAnchorChange`). The player seeds a snapshot at the
   * current playhead so adding a review starts from where the video is paused.
   */
  initialAnchor?: ReviewAnchor;
  /**
   * Controlled anchor value. When `anchor` + `onAnchorChange` are provided the
   * composer uses the caller's anchor state instead of its own (the player owns
   * the anchor control and shares it with the composer).
   */
  anchor?: ReviewAnchor;
  /** Callback for controlled anchor changes (see `anchor`). */
  onAnchorChange?: (anchor: ReviewAnchor) => void;
  /** Open the full-video drawing overlay (from the pen button). */
  onStartDrawing: () => void;
  /** Close/cancel the composer without creating a review. */
  onClose: () => void;
  /** Called after a review is successfully added (the parent refreshes the list). */
  onAdded: () => void | Promise<void>;
}

/** Minimum segment length before a range is treated as a real segment (not a snapshot). */
const MIN_SEGMENT_SECONDS = 0.05;

/**
 * The shared "add a review" composer: voice recorder, comment box, anchor
 * picker (tap = snapshot, drag = segment) and submit. Used both by the reviews
 * overlay panel and inline inside the video player controls.
 */
export function VideoReviewComposer({
  videoId,
  initialAnchor,
  anchor: anchorProp,
  onAnchorChange,
  onStartDrawing,
  onClose,
  onAdded,
}: VideoReviewComposerProps) {
  const voice = useVoiceRecorder();

  // Composer state
  const [text, setText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Anchor state: controlled by the caller when `anchor`/`onAnchorChange` are
  // provided (the player shares its always-visible anchor control), otherwise
  // owned locally (the reviews overlay panel).
  const [internalAnchor, setInternalAnchor] = useState<ReviewAnchor>(
    initialAnchor ?? { kind: 'none' },
  );
  const anchor = useMemo<ReviewAnchor>(
    () => (onAnchorChange ? anchorProp ?? { kind: 'none' } : internalAnchor),
    [onAnchorChange, anchorProp, internalAnchor],
  );
  const changeAnchor = useCallback(
    (next: ReviewAnchor) => {
      if (onAnchorChange) onAnchorChange(next);
      else setInternalAnchor(next);
    },
    [onAnchorChange],
  );

  const appliedAudioRef = useRef<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // While recording, the comment box shows the live speech-to-text transcription.
  const displayText = voice.recording ? `${voice.transcript}${voice.interimText}` : text;

  // Re-size the single-line comment box as its content changes (typing or transcript).
  useEffect(() => {
    autoGrow();
  }, [displayText, autoGrow]);

  // When a voice recording completes, drop its transcript into the text field.
  useEffect(() => {
    const audioData = voice.result.audioData;
    if (audioData && audioData !== appliedAudioRef.current) {
      appliedAudioRef.current = audioData;
      if (voice.result.transcript) setText(voice.result.transcript);
    }
    if (!audioData) appliedAudioRef.current = null;
  }, [voice.result]);

  // Focus the comment box when the composer first opens.
  useEffect(() => {
    textRef.current?.focus();
  }, []);

  const resetComposer = useCallback(() => {
    setText('');
    changeAnchor({ kind: 'none' });
    setSubmitError(null);
    voice.reset();
  }, [changeAnchor, voice]);

  const submitReview = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body: AddVideoReviewRequest = { text: text.trim() || null };

      if (anchor.kind === 'segment') {
        body.timestamp = toTimeSpan(anchor.start);
        const span = anchor.end - anchor.start;
        // A zero/near-zero "segment" is really a snapshot point.
        if (span > MIN_SEGMENT_SECONDS) {
          body.duration = toTimeSpan(span);
        }
      } else if (anchor.kind === 'snapshot') {
        body.timestamp = toTimeSpan(anchor.time);
      }

      if (voice.result.audioData) {
        body.audioData = voice.result.audioData;
        body.audioMimeType = voice.result.audioMimeType;
      }

      await addVideoReview(videoId, body);
      resetComposer();
      await onAdded();
    } catch (err) {
      console.error('Failed to add review:', err);
      setSubmitError('Failed to add review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [text, anchor, voice.result, videoId, resetComposer, onAdded]);

  return (
    <div
      className="vro-overlay"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {(voice.recording || voice.result.audioData) && (
        <div className="vro-audio-status">
          {voice.recording && (
            <span className="vro-listening">
              <span className="vro-listening-dot" />
              Listening…
            </span>
          )}
          {voice.result.audioData && (
            <div className="vro-attached">
              <audio
                controls
                src={toDataUrl(voice.result.audioData, voice.result.audioMimeType, 'audio/webm') ?? undefined}
              />
              <button type="button" className="vro-remove" onClick={voice.reset}>
                <FontAwesomeIcon icon={faTimes} />
                Remove audio
              </button>
            </div>
          )}
        </div>
      )}

      <div className="vro-compose">
        <button
          type="button"
          className={`vro-mic${voice.recording ? ' recording' : ''}`}
          onClick={() => (voice.recording ? voice.stop() : void voice.start())}
          aria-label={voice.recording ? 'Stop recording' : 'Record voice'}
          title={voice.recording ? 'Stop recording' : 'Record voice'}
        >
          <FontAwesomeIcon icon={voice.recording ? faStop : faMicrophone} />
        </button>
        <button
          type="button"
          className="vro-mic"
          onClick={onStartDrawing}
          aria-label="Drawing review"
          title="Drawing review"
        >
          <FontAwesomeIcon icon={faPen} />
        </button>
        <textarea
          ref={textRef}
          className="vro-caption"
          rows={1}
          placeholder="Write a comment or record audio about this video..."
          value={displayText}
          readOnly={voice.recording}
          onChange={(e) => {
            setText(e.target.value);
            autoGrow();
          }}
        />
        <button
          type="button"
          className="vro-close-inline"
          onClick={onClose}
          aria-label="Close"
          title="Close"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <button
          type="button"
          className="vro-submit"
          onClick={() => void submitReview()}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin />
              Adding...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faPlus} />
              Add review
            </>
          )}
        </button>
      </div>

      {(voice.micError || submitError) && (
        <p className="vro-error">{voice.micError ?? submitError}</p>
      )}
    </div>
  );
}
