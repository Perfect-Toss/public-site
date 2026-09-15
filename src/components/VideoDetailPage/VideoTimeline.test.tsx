import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { VideoReview } from '../../api/api.videos';
import { VideoTimeline } from './VideoTimeline';

function review(overrides: Partial<VideoReview> = {}): VideoReview {
  return { id: 'r1', ...overrides };
}

/** Run a callback with the timeline's inner track reporting a fixed width. */
function withTrackWidth(width: number, run: () => void) {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => width,
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  }
}

/** Extract the inline `top` (lane) of a marker/segment element. */
const topOf = (el: Element | null) => {
  const match = /top:\s*([\d.]+)px/.exec(el?.getAttribute('style') ?? '');
  return match ? parseFloat(match[1]) : null;
};

describe('VideoTimeline', () => {
  it('renders nothing when there are no anchored reviews', () => {
    const { container } = render(
      <VideoTimeline reviews={[]} duration={10} onSelectReview={() => {}} />,
    );
    expect(container.querySelector('.video-timeline')).toBeNull();
  });

  it('renders a marker dot for a snapshot review', () => {
    const { container } = render(
      <VideoTimeline
        reviews={[review({ timestamp: '00:00:07' })]}
        duration={10}
        onSelectReview={() => {}}
      />,
    );
    const marker = container.querySelector('.video-timeline-marker');
    expect(marker).not.toBeNull();
    expect(marker?.getAttribute('style')).toContain('70%');
    expect(container.querySelector('.video-timeline-segment')).toBeNull();
  });

  it('renders a marker dot for a snapshot even with a zero-length duration', () => {
    const { container } = render(
      <VideoTimeline
        reviews={[review({ timestamp: '00:00:07', duration: '00:00:00' })]}
        duration={10}
        onSelectReview={() => {}}
      />,
    );
    expect(container.querySelector('.video-timeline-marker')).not.toBeNull();
    expect(container.querySelector('.video-timeline-segment')).toBeNull();
  });

  it('renders a segment bar for a segment review', () => {
    const { container } = render(
      <VideoTimeline
        reviews={[review({ timestamp: '00:00:05', duration: '00:00:03' })]}
        duration={10}
        onSelectReview={() => {}}
      />,
    );
    const segment = container.querySelector('.video-timeline-segment');
    expect(segment).not.toBeNull();
    expect(segment?.getAttribute('style')).toContain('50%');
    expect(segment?.getAttribute('style')).toContain('30%');
    expect(container.querySelector('.video-timeline-marker')).toBeNull();
  });

  it('calls onSelectReview when a marker is clicked', () => {
    const onSelect = (id: string) => {
      calls.push(id);
    };
    const calls: string[] = [];
    const { container } = render(
      <VideoTimeline
        reviews={[review({ id: 'snap-1', timestamp: '00:00:03' })]}
        duration={10}
        onSelectReview={onSelect}
      />,
    );
    const marker = container.querySelector('.video-timeline-marker');
    expect(marker).not.toBeNull();
    marker?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(calls).toEqual(['snap-1']);
  });

  it('stacks snapshot markers in separate lanes when their dots would overlap on screen', () => {
    // Two snapshots 0.06s apart on a 10s / 976px track sit ~6px apart — closer
    // than the 12px dot diameter — so they must land in different lanes.
    withTrackWidth(976, () => {
      const { container } = render(
        <VideoTimeline
          reviews={[
            review({ id: 'snap-1', timestamp: '00:00:07' }),
            review({ id: 'snap-2', timestamp: '00:00:07.06' }),
          ]}
          duration={10}
          onSelectReview={() => {}}
        />,
      );
      const markers = container.querySelectorAll('.video-timeline-marker');
      expect(markers).toHaveLength(2);
      expect(topOf(markers[0])).not.toBe(topOf(markers[1]));
    });
  });

  it('keeps snapshot markers in the same lane when their dots do not overlap', () => {
    // Two snapshots 0.3s apart on a 10s / 976px track sit ~29px apart — wider
    // than the 12px dot diameter — so they can share a lane.
    withTrackWidth(976, () => {
      const { container } = render(
        <VideoTimeline
          reviews={[
            review({ id: 'snap-1', timestamp: '00:00:07' }),
            review({ id: 'snap-2', timestamp: '00:00:07.3' }),
          ]}
          duration={10}
          onSelectReview={() => {}}
        />,
      );
      const markers = container.querySelectorAll('.video-timeline-marker');
      expect(markers).toHaveLength(2);
      expect(topOf(markers[0])).toBe(topOf(markers[1]));
    });
  });

  it('gives a ranged review the same unified color as its author on a snapshot', () => {
    // The segment's embedded author color is a near-white "unset" default, while
    // the same author's snapshot carries the real color. Both must render in the
    // author's real color so the range matches the dot.
    const { container } = render(
      <VideoTimeline
        reviews={[
          review({
            id: 'seg-1',
            timestamp: '00:00:05',
            duration: '00:00:03',
            createdByUser: { id: 'u1', email: 'same@x.com', colorHex: '#F0F0F0' },
          }),
          review({
            id: 'snap-1',
            timestamp: '00:00:01',
            createdByUser: { id: 'u1', email: 'same@x.com', colorHex: '#CFFF04' },
          }),
        ]}
        duration={10}
        onSelectReview={() => {}}
      />,
    );
    const segment = container.querySelector('.video-timeline-segment');
    const marker = container.querySelector('.video-timeline-marker');
    // React serializes hex fills as rgb() in the style attribute.
    expect(segment?.getAttribute('style')).toContain('rgb(207, 255, 4)'); // #CFFF04
    expect(marker?.getAttribute('style')).toContain('rgb(207, 255, 4)'); // #CFFF04
  });

  it('does not borrow another reviewer color for an author with only an unset color', () => {
    const { container } = render(
      <VideoTimeline
        reviews={[
          review({
            id: 'seg-1',
            timestamp: '00:00:05',
            duration: '00:00:03',
            createdByUser: { id: 'u1', email: 'a@x.com', colorHex: '#F0F0F0' },
          }),
          review({
            id: 'snap-1',
            timestamp: '00:00:01',
            createdByUser: { id: 'u2', email: 'b@x.com', colorHex: '#CFFF04' },
          }),
        ]}
        duration={10}
        onSelectReview={() => {}}
      />,
    );
    const segment = container.querySelector('.video-timeline-segment');
    const marker = container.querySelector('.video-timeline-marker');
    expect(segment?.getAttribute('style')).not.toContain('rgb(207, 255, 4)'); // #CFFF04
    expect(segment?.getAttribute('style')).not.toContain('#F0F0F0');
    expect(marker?.getAttribute('style')).toContain('rgb(207, 255, 4)'); // #CFFF04
  });
});
