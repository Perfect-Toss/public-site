import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchVideoReviewContentUrl, type VideoReview } from '../../api/api.videos';

/**
 * A review item's blob never changes, so its URL is kept for the whole session.
 * The URL is still a time-limited SAS token, so a failed load drops the entry
 * and mints a fresh one.
 */
const urlCache = new Map<string, string>();

export interface ReviewContentUrl {
  url: string | null;
  /** Re-resolve the URL after the media failed to load (e.g. an expired token). */
  onError: () => void;
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
    fetchVideoReviewContentUrl(videoId, itemId)
      .then((value) => {
        if (!value) return;
        urlCache.set(key, value);
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
