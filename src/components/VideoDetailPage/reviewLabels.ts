import type {
  VideoReview,
  VideoReviewRequestStatus,
} from '../../api/api.videos';
import { formatPosition, parseTimeSpanToSeconds } from './videoTime';

export const REQUEST_STATUS_LABELS: Record<VideoReviewRequestStatus, string> = {
  Unknown: 'Unknown',
  Open: 'Open',
  Done: 'Done',
};

/** Position text for a review item ("0:12" or "0:12 – 0:20"). */
export function positionText(review: VideoReview): string {
  const ts = parseTimeSpanToSeconds(review.timestamp);
  if (ts == null) return '';
  const dur = parseTimeSpanToSeconds(review.duration);
  return dur != null && dur > 0
    ? `${formatPosition(ts)} – ${formatPosition(ts + dur)}`
    : formatPosition(ts);
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
