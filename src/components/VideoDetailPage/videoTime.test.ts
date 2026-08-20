import { describe, expect, it } from 'vitest';
import type { VideoReview } from '../../api/api.videos';
import { buildVideoAnchors, parseTimeSpanToSeconds, sortReviewsByTime } from './videoTime';

function review(overrides: Partial<VideoReview> = {}): VideoReview {
  return { id: 'r1', ...overrides };
}

describe('parseTimeSpanToSeconds', () => {
  it('parses plain seconds', () => {
    expect(parseTimeSpanToSeconds('7')).toBe(7);
    expect(parseTimeSpanToSeconds('7.5')).toBeCloseTo(7.5);
  });

  it('parses .NET TimeSpan strings', () => {
    expect(parseTimeSpanToSeconds('00:00:07')).toBe(7);
    expect(parseTimeSpanToSeconds('00:01:30.5000000')).toBeCloseTo(90.5);
    expect(parseTimeSpanToSeconds('1.02:03:04')).toBeCloseTo(93784);
  });

  it('parses ISO 8601 durations', () => {
    expect(parseTimeSpanToSeconds('PT5S')).toBe(5);
    expect(parseTimeSpanToSeconds('PT1M30S')).toBe(90);
  });

  it('returns null for missing/unknown values', () => {
    expect(parseTimeSpanToSeconds(null)).toBeNull();
    expect(parseTimeSpanToSeconds(undefined)).toBeNull();
    expect(parseTimeSpanToSeconds('')).toBeNull();
    expect(parseTimeSpanToSeconds('abc')).toBeNull();
  });
});

describe('buildVideoAnchors', () => {
  it('classifies a snapshot (timestamp, no duration) as a point', () => {
    const anchors = buildVideoAnchors([review({ timestamp: '00:00:07' })]);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].start).toBe(7);
    expect(anchors[0].end).toBeNull();
  });

  it('classifies a zero-length duration as a snapshot (not a segment)', () => {
    const anchors = buildVideoAnchors([
      review({ timestamp: '00:00:07', duration: '00:00:00' }),
    ]);
    expect(anchors[0].end).toBeNull();
  });

  it('classifies a segment (timestamp + duration) as a range', () => {
    const anchors = buildVideoAnchors([
      review({ timestamp: '00:00:05', duration: '00:00:03' }),
    ]);
    expect(anchors[0].start).toBe(5);
    expect(anchors[0].end).toBe(8);
  });

  it('anchors general notes (no timestamp) at the start', () => {
    const anchors = buildVideoAnchors([review()]);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].start).toBe(0);
    expect(anchors[0].end).toBeNull();
    expect(anchors[0].general).toBe(true);
  });
});

describe('sortReviewsByTime', () => {
  it('sorts by timestamp, then by created time', () => {
    const a = review({ id: 'a', timestamp: '00:00:10', createdAt: '2026-01-01T00:00:00Z' });
    const b = review({ id: 'b', timestamp: '00:00:05', createdAt: '2026-01-01T00:00:00Z' });
    const c = review({ id: 'c', timestamp: '00:00:05', createdAt: '2026-01-02T00:00:00Z' });
    const d = review({ id: 'd', createdAt: '2026-01-01T00:00:00Z' }); // general note → 0

    const sorted = sortReviewsByTime([a, b, c, d]);
    expect(sorted.map((r) => r.id)).toEqual(['d', 'b', 'c', 'a']);
  });
});
