import { useCallback, useEffect, useState } from 'react';
import {
  fetchVideoReviewRequests,
  fetchVideoReviews,
  type VideoReview,
  type VideoReviewRequest,
} from '../../api/api.videos';

/**
 * Shared loader for a video's reviews + review requests so the marker timeline
 * and the review overlay panel stay in sync.
 */
export function useVideoReviews(videoId: string) {
  const [reviews, setReviews] = useState<VideoReview[]>([]);
  const [requests, setRequests] = useState<VideoReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!videoId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch each independently so one failing endpoint doesn't blank out the
      // other (the timeline and list depend on `reviews` being populated).
      const [rv, rq] = await Promise.allSettled([
        fetchVideoReviews(videoId),
        fetchVideoReviewRequests(videoId),
      ]);
      if (rv.status === 'fulfilled') {
        setReviews(rv.value);
      } else {
        console.error('Failed to load video reviews:', rv.reason);
        setError('Could not load reviews.');
      }
      if (rq.status === 'fulfilled') {
        setRequests(rq.value);
      } else {
        console.error('Failed to load video review requests:', rq.reason);
      }
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { reviews, requests, loading, error, reload };
}
