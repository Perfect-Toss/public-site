import type { VideoReview } from '../../api/api.videos';

/** Shared helpers for converting between seconds and the API's TimeSpan strings. */

/** Convert seconds to a .NET-style TimeSpan string ("hh:mm:ss.fff"). */
export function toTimeSpan(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${s.toFixed(3).padStart(6, '0')}`;
}

/**
 * Parse a position value to seconds. Tolerates the common formats the API may
 * return for a `date-span`: plain seconds ("7", "7.5"), ISO 8601 durations
 * ("PT5S"), and .NET TimeSpan strings ("[d.]hh:mm:ss[.fffffff]", "mm:ss").
 */
export function parseTimeSpanToSeconds(value?: string | null): number | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Plain number of seconds.
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // ISO 8601 duration, e.g. "PT5S", "PT1M30S", "PT0.5S", "P1DT2H3M4.5S".
  const iso = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(trimmed);
  if (iso && iso.slice(1).some((group) => group != null)) {
    return (
      parseInt(iso[1] ?? '0', 10) * 86400 +
      parseInt(iso[2] ?? '0', 10) * 3600 +
      parseInt(iso[3] ?? '0', 10) * 60 +
      parseFloat(iso[4] ?? '0')
    );
  }

  // "d.hh:mm:ss[.fffffff]" (days component).
  const withDays = /^(\d+)\.(\d{1,2}):(\d{1,2}):(\d{1,2})(?:\.(\d+))?$/.exec(trimmed);
  if (withDays) {
    const days = parseInt(withDays[1], 10);
    const hours = parseInt(withDays[2], 10);
    const minutes = parseInt(withDays[3], 10);
    const seconds = parseInt(withDays[4], 10);
    const frac = withDays[5] ? parseFloat(`0.${withDays[5]}`) : 0;
    return days * 86400 + hours * 3600 + minutes * 60 + seconds + frac;
  }

  // "hh:mm:ss[.fffffff]" (3 parts).
  const plain = /^(\d{1,2}):(\d{1,2}):(\d{1,2})(?:\.(\d+))?$/.exec(trimmed);
  if (plain) {
    const hours = parseInt(plain[1], 10);
    const minutes = parseInt(plain[2], 10);
    const seconds = parseInt(plain[3], 10);
    const frac = plain[4] ? parseFloat(`0.${plain[4]}`) : 0;
    return hours * 3600 + minutes * 60 + seconds + frac;
  }

  // "mm:ss[.fff]" (2 parts).
  const compact = /^(\d{1,2}):(\d{1,2})(?:\.(\d+))?$/.exec(trimmed);
  if (compact) {
    const minutes = parseInt(compact[1], 10);
    const seconds = parseInt(compact[2], 10);
    const frac = compact[3] ? parseFloat(`0.${compact[3]}`) : 0;
    return minutes * 60 + seconds + frac;
  }

  return null;
}

/** Format a position in seconds as "m:ss.s". */
export function formatPosition(seconds: number): string {
  const total = Math.max(0, seconds);
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

export interface VideoAnchor {
  id: string;
  start: number;
  /** End time for segment reviews, null for snapshot markers. */
  end: number | null;
  hasDrawing: boolean;
  /** True for general notes that have no real position (shown at the start). */
  general: boolean;
}

/**
 * Sort reviews by timestamp (reviews without a timestamp — general notes —
 * count as 0), then by created time for stable ordering.
 */
export function sortReviewsByTime(reviews: VideoReview[]): VideoReview[] {
  return [...reviews].sort((a, b) => {
    const at = parseTimeSpanToSeconds(a.timestamp) ?? 0;
    const bt = parseTimeSpanToSeconds(b.timestamp) ?? 0;
    if (at !== bt) return at - bt;
    const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ac - bc;
  });
}

/**
 * Build timeline anchors from review items. General notes (no timestamp) are
 * anchored at the start so they stay selectable; snapshots (timestamp, no
 * meaningful duration) become point markers; segments (timestamp + duration)
 * become ranges. Reviews are ordered by timestamp, then created time.
 */
export function buildVideoAnchors(reviews: VideoReview[]): VideoAnchor[] {
  const anchors: VideoAnchor[] = [];
  for (const review of sortReviewsByTime(reviews)) {
    const start = parseTimeSpanToSeconds(review.timestamp);
    if (start == null) {
      anchors.push({
        id: review.id,
        start: 0,
        end: null,
        hasDrawing: Boolean(review.drawingData),
        general: true,
      });
      continue;
    }
    const dur = parseTimeSpanToSeconds(review.duration);
    anchors.push({
      id: review.id,
      start,
      // A zero/empty duration means it's a snapshot point, not a segment.
      end: dur != null && dur > 0 ? start + dur : null,
      hasDrawing: Boolean(review.drawingData),
      general: false,
    });
  }
  return anchors;
}
