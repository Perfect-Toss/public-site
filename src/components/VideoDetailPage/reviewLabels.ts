import type { VideoReview } from '../../api/api.videos';
import { formatPosition, parseTimeSpanToSeconds } from './videoTime';

/** Position text for a review item ("0:12" or "0:12 – 0:20"). */
export function positionText(review: VideoReview): string {
  const ts = parseTimeSpanToSeconds(review.timestamp);
  if (ts == null) return '';
  const dur = parseTimeSpanToSeconds(review.duration);
  return dur != null && dur > 0
    ? `${formatPosition(ts)} – ${formatPosition(ts + dur)}`
    : formatPosition(ts);
}

/**
 * The person a review is attributed to: the assigned reviewer when there is one,
 * otherwise whoever created the item.
 */
export function reviewAuthor(review?: VideoReview | null): VideoReview['reviewer'] {
  return review?.reviewer ?? review?.createdByUser;
}

/** Rebuild a data: URL from base64 + MIME type. */
export function toDataUrl(
  data?: string | null,
  mimeType?: string | null,
  fallback = 'image/png',
): string | null {
  if (!data) return null;
  return `data:${mimeType || fallback};base64,${data}`;
}
