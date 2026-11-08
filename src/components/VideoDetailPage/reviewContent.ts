import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { fetchVideoReviewContentUrl, type VideoReview } from '../../api/api.videos';

/**
 * A review item's blob never changes, so its URL is kept for the whole session.
 * The URL is still a time-limited SAS token, so a failed load drops the entry
 * and mints a fresh one.
 */
const urlCache = new Map<string, string>();

/**
 * Downloaded blobs, as `blob:` object URLs. Storage is hit ONCE per item per
 * session; every later play/render reads the bytes from memory.
 */
const blobCache = new Map<string, string>();
/** In-flight downloads, so two consumers of the same item share one request. */
const blobPending = new Map<string, Promise<string | null>>();
/**
 * Whether this origin may read the blobs at all. Storage without CORS headers
 * refuses the fetch, and there is no way to learn that ahead of time — so try
 * once, then stop asking (otherwise every play logs a CORS error and burns a
 * request).
 */
let blobsReadable = true;

export interface ReviewContentUrl {
  url: string | null;
  /** Re-resolve the URL after the media failed to load (e.g. an expired token). */
  onError: () => void;
}

/**
 * Resolve a review item's blob URL, reusing the session cache. The hook-free
 * sibling of `useReviewContentUrl`, for imperative callers (the player plays a
 * selected review's voice note).
 */
export async function loadReviewContentUrl(
  videoId: string,
  itemId: string,
): Promise<string | null> {
  const key = `${videoId}:${itemId}`;
  const cached = urlCache.get(key);
  if (cached) return cached;
  const value = await fetchVideoReviewContentUrl(videoId, itemId);
  if (!value) return null;
  urlCache.set(key, value);
  return value;
}

/**
 * The review item's media as a local `blob:` URL, downloaded once and kept for
 * the session. Playback (and re-playback) then never touches storage again.
 *
 * Returns null when the blob can't be read here — storage without CORS headers
 * for this origin, or a failed request — so callers fall back to the SAS URL.
 */
export function loadReviewContentBlobUrl(
  videoId: string,
  itemId: string,
): Promise<string | null> {
  if (!blobsReadable) return Promise.resolve(null);
  const key = `${videoId}:${itemId}`;
  const cached = blobCache.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = blobPending.get(key);
  if (pending) return pending;

  const download = (async (): Promise<string | null> => {
    try {
      let sasUrl = await loadReviewContentUrl(videoId, itemId);
      if (!sasUrl) return null;
      let response = await fetch(sasUrl);
      if (!response.ok) {
        // A cached SAS has probably expired: mint a fresh one and retry once.
        forgetReviewContentUrl(videoId, itemId);
        sasUrl = await loadReviewContentUrl(videoId, itemId);
        if (!sasUrl) return null;
        response = await fetch(sasUrl);
        if (!response.ok) {
          // Still failing: drop the SAS too, so a streaming fallback mints a
          // fresh one instead of reusing this dead link.
          forgetReviewContentUrl(videoId, itemId);
          return null;
        }
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      blobCache.set(key, objectUrl);
      return objectUrl;
    } catch (err) {
      // A TypeError is a blocked/CORS/offline fetch: no point asking again this
      // session, so callers stream the SAS URL instead. Anything else is
      // transient and retried on the next play.
      if (err instanceof TypeError) blobsReadable = false;
      return null;
    } finally {
      blobPending.delete(key);
    }
  })();

  blobPending.set(key, download);
  return download;
}

/** Drop a cached download (e.g. it failed to decode) so it is fetched again. */
export function forgetReviewContentBlob(videoId: string, itemId: string): void {
  const key = `${videoId}:${itemId}`;
  const objectUrl = blobCache.get(key);
  if (!objectUrl) return;
  blobCache.delete(key);
  URL.revokeObjectURL(objectUrl);
}

/** Drop a cached SAS URL (e.g. it expired) so the next load mints a fresh one. */
export function forgetReviewContentUrl(videoId: string, itemId: string): void {
  urlCache.delete(`${videoId}:${itemId}`);
}

/* ─── Review audio — ONE player per review, shared by every surface ───────── */

/** One element per review item, so the list control and the marker share it. */
const audioCache = new Map<string, HTMLAudioElement>();
/** The note currently playing (only one at a time). */
let currentAudio: HTMLAudioElement | null = null;
/** Output settings, mirrored from the video player. */
let audioOutput: { muted: boolean; volume: number } = { muted: false, volume: 1 };
const audioListeners = new Set<() => void>();

const audioKey = (videoId: string, itemId: string) => `${videoId}:${itemId}`;

function notifyAudio() {
  for (const listener of audioListeners) listener();
}

/** Follow the video player's mute/volume for review notes too. */
export function setReviewAudioOutput(next: Partial<{ muted: boolean; volume: number }>): void {
  audioOutput = { ...audioOutput, ...next };
}

/** Subscribe to any change of "which note is playing" (for UI state). */
export function subscribeReviewAudio(listener: () => void): () => void {
  audioListeners.add(listener);
  return () => {
    audioListeners.delete(listener);
  };
}

/** Is this review's note the one currently playing? */
export function isReviewAudioPlaying(videoId: string, itemId: string): boolean {
  const audio = audioCache.get(audioKey(videoId, itemId));
  return Boolean(audio && audio === currentAudio && !audio.paused);
}

/** Elements already playing their locally downloaded copy. */
const localSources = new WeakSet<HTMLAudioElement>();

function createReviewAudio(
  videoId: string,
  itemId: string,
  src: string,
  preload: 'metadata' | 'auto',
): HTMLAudioElement {
  const key = audioKey(videoId, itemId);
  const audio = new Audio();
  audio.preload = preload;
  audio.muted = audioOutput.muted;
  audio.volume = audioOutput.volume;
  audio.src = src;
  audio.addEventListener('play', notifyAudio);
  audio.addEventListener('pause', notifyAudio);
  audio.addEventListener('timeupdate', notifyAudio);
  audio.addEventListener('loadedmetadata', notifyAudio);
  audio.addEventListener('durationchange', notifyAudio);
  audio.addEventListener('ended', () => {
    if (currentAudio === audio) currentAudio = null;
    notifyAudio();
  });
  audio.onerror = () => {
    console.error('Failed to play review audio');
    audioCache.delete(key);
    forgetReviewContentBlob(videoId, itemId);
    forgetReviewContentUrl(videoId, itemId);
    if (currentAudio === audio) currentAudio = null;
    notifyAudio();
  };
  return audio;
}

/**
 * Element created for the row's clock/scrubber: preloads only the clip's
 * metadata (a small range request) so the duration is known before anyone
 * presses play. The full clip is not downloaded until playback, when the
 * element is moved onto the cached local copy.
 */
export function primeReviewAudio(videoId: string, itemId: string): void {
  if (audioCache.has(audioKey(videoId, itemId))) return;
  void (async () => {
    const sasUrl = await loadReviewContentUrl(videoId, itemId).catch(() => null);
    // Re-check: another caller may have primed or created it meanwhile.
    if (!sasUrl || audioCache.has(audioKey(videoId, itemId))) return;
    audioCache.set(audioKey(videoId, itemId), createReviewAudio(videoId, itemId, sasUrl, 'metadata'));
    notifyAudio();
  })();
}

/**
 * Move a metadata-only element onto the locally downloaded clip, so playback
 * never streams from storage. Keeps the playhead if it had been scrubbed.
 */
async function moveToLocalClip(
  audio: HTMLAudioElement,
  videoId: string,
  itemId: string,
): Promise<void> {
  if (localSources.has(audio)) return;
  const blobUrl = await loadReviewContentBlobUrl(videoId, itemId);
  if (!blobUrl) return;

  const resumeAt = audio.currentTime;
  audio.src = blobUrl;
  localSources.add(audio);
  try {
    audio.load();
  } catch {
    // jsdom has no media pipeline.
  }
  if (resumeAt > 0) {
    await new Promise<void>((resolve) => {
      audio.addEventListener(
        'loadedmetadata',
        () => {
          audio.currentTime = resumeAt;
          resolve();
        },
        { once: true },
      );
      window.setTimeout(resolve, 1500);
    });
  }
}

/**
 * The shared element for a review's note, ready to play from the cached clip.
 * Every caller gets the same element — the marker click and the row control can
 * never start two downloads.
 */
export async function getReviewAudio(
  videoId: string,
  itemId: string,
): Promise<HTMLAudioElement | null> {
  const key = audioKey(videoId, itemId);
  const existing = audioCache.get(key);
  if (existing) {
    await moveToLocalClip(existing, videoId, itemId);
    return existing;
  }

  const src =
    (await loadReviewContentBlobUrl(videoId, itemId)) ??
    (await loadReviewContentUrl(videoId, itemId));
  if (!src) return null;

  // Another caller may have created it while we were downloading.
  const created = audioCache.get(key);
  if (created) {
    await moveToLocalClip(created, videoId, itemId);
    return created;
  }

  const audio = createReviewAudio(videoId, itemId, src, 'auto');
  audioCache.set(key, audio);
  if (src.startsWith('blob:')) localSources.add(audio);
  return audio;
}

/**
 * Play a review's note, stopping whichever note was playing.
 *
 * `restart` (default) replays from the top — that is what selecting a review
 * means. The row's scrubber passes `restart: false` so pressing play after
 * seeking resumes from the playhead instead of jumping back to 0:00.
 */
export async function playReviewAudio(
  videoId: string,
  itemId: string,
  { restart = true }: { restart?: boolean } = {},
): Promise<void> {
  let audio = await getReviewAudio(videoId, itemId);
  if (!audio) {
    // Nothing could be resolved (usually a stale token): drop the caches and
    // give it one more go with a freshly minted SAS.
    forgetReviewContentBlob(videoId, itemId);
    forgetReviewContentUrl(videoId, itemId);
    audio = await getReviewAudio(videoId, itemId);
  }
  if (!audio) return;
  if (currentAudio && currentAudio !== audio) currentAudio.pause();
  currentAudio = audio;
  audio.muted = audioOutput.muted;
  audio.volume = audioOutput.volume;
  // Resume needs a real playhead; a finished note starts over.
  const atEnd =
    audio.ended ||
    (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration - 0.05);
  if (restart || atEnd) audio.currentTime = 0;
  try {
    await audio.play();
  } catch (err) {
    console.error('Failed to play review audio:', err);
  }
}

/** Play/pause this review's note from the row's control (resumes from the scrubber). */
export async function toggleReviewAudio(videoId: string, itemId: string): Promise<void> {
  if (isReviewAudioPlaying(videoId, itemId)) {
    currentAudio?.pause();
    currentAudio = null;
    notifyAudio();
    return;
  }
  await playReviewAudio(videoId, itemId, { restart: false });
}

/** Stop the note that is playing, if any. */
export function pauseReviewAudio(): void {
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio = null;
  notifyAudio();
}

/** Stop everything (the player unmounted). */
export function pauseAllReviewAudio(): void {
  for (const audio of audioCache.values()) audio.pause();
  currentAudio = null;
  notifyAudio();
}

/** Seek inside a review's note. */
export function seekReviewAudio(videoId: string, itemId: string, seconds: number): void {
  const audio = audioCache.get(audioKey(videoId, itemId));
  if (!audio) return;
  audio.currentTime = Math.max(0, seconds);
  notifyAudio();
}

export interface ReviewAudioState {
  playing: boolean;
  currentTime: number;
  duration: number;
}

const NO_AUDIO_STATE: ReviewAudioState = { playing: false, currentTime: 0, duration: 0 };
/** Last snapshot per item, so `useSyncExternalStore` gets a stable value. */
const audioStateCache = new Map<string, ReviewAudioState>();

/** Playback state of a review's note (a stable object while nothing changes). */
export function readReviewAudioState(videoId: string, itemId: string): ReviewAudioState {
  const key = audioKey(videoId, itemId);
  const audio = audioCache.get(key);
  const previous = audioStateCache.get(key) ?? NO_AUDIO_STATE;
  if (!audio) return previous;

  const playing = audio === currentAudio && !audio.paused;
  const currentTime = audio.currentTime;
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  if (
    previous.playing === playing &&
    previous.currentTime === currentTime &&
    previous.duration === duration
  ) {
    return previous;
  }

  const next: ReviewAudioState = { playing, currentTime, duration };
  audioStateCache.set(key, next);
  return next;
}

/** Live playback state of a review's note (play state, position, duration). */
export function useReviewAudioPlayer(
  videoId: string | null | undefined,
  itemId: string,
): ReviewAudioState {
  const getSnapshot = useCallback(
    () => (videoId ? readReviewAudioState(videoId, itemId) : NO_AUDIO_STATE),
    [videoId, itemId],
  );
  return useSyncExternalStore(subscribeReviewAudio, getSnapshot);
}

/**
 * Resolve the SAS URL of a review item's blob (its audio recording or drawing
 * overlay). Text items have no blob, so the URL stays null for them.
 */
export function useReviewContentUrl(
  videoId: string | null | undefined,
  review: VideoReview,
): ReviewContentUrl {
  const itemId = review.id;
  const hasBlob = review.contentKind === 'Audio' || review.contentKind === 'Drawing';
  const key = videoId && hasBlob ? `${videoId}:${itemId}` : null;

  const [url, setUrl] = useState<string | null>(() => (key ? urlCache.get(key) ?? null : null));
  const [attempt, setAttempt] = useState(0);
  const retriedRef = useRef(false);

  // A fresh URL gets one retry of its own.
  useEffect(() => {
    retriedRef.current = false;
  }, [url]);

  useEffect(() => {
    if (!key || !videoId) {
      setUrl(null);
      return;
    }

    const cached = urlCache.get(key);
    if (cached) {
      setUrl(cached);
      return;
    }

    let active = true;
    loadReviewContentUrl(videoId, itemId)
      .then((value) => {
        if (!value) return;
        if (active) setUrl(value);
      })
      .catch((err) => console.error('Failed to load review content:', err));

    return () => {
      active = false;
    };
  }, [key, videoId, itemId, attempt]);

  const onError = useCallback(() => {
    if (!key || retriedRef.current) return;
    retriedRef.current = true;
    urlCache.delete(key);
    setUrl(null);
    setAttempt((value) => value + 1);
  }, [key]);

  return { url, onError };
}
