import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { VideoReview } from '../../api/api.videos';
import { VideoTimeline } from './VideoTimeline';

function review(overrides: Partial<VideoReview> = {}): VideoReview {
  return { id: 'r1', ...overrides };
}

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
});
