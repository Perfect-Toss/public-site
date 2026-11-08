import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { VideoReview, VideoReviewRequest } from '../../api/api.videos';
import { SnackbarProvider } from '../common';
import { VideoReviewList } from './VideoReviewList';
import { VideoReviewRequestList } from './VideoReviewRequestList';

/**
 * Reviews and review requests are SEPARATE page sections: each owns its header,
 * count and collapse state, and only ever lists its own items.
 */

function review(overrides: Partial<VideoReview> = {}): VideoReview {
  return {
    id: 'rev-1',
    timestamp: '00:00:05',
    text: 'Keep the elbow up',
    createdByUser: { id: 'u1', firstName: 'Sam', lastName: 'Lee' },
    ...overrides,
  };
}

function request(overrides: Partial<VideoReviewRequest> = {}): VideoReviewRequest {
  return {
    id: 'req-1',
    requestedBy: { id: 'u2', email: 'ada@x.com', firstName: 'Ada', lastName: 'Ng' },
    requestNote: 'Please look at the toss',
    status: 'Open',
    createdAt: '2026-11-01T10:00:00Z',
    ...overrides,
  };
}

function renderRequests(requests: VideoReviewRequest[]) {
  return render(
    <SnackbarProvider>
      <VideoReviewRequestList videoId="v1" requests={requests} reload={async () => {}} />
    </SnackbarProvider>,
  );
}

function renderReviews(reviews: VideoReview[]) {
  return render(
    <SnackbarProvider>
      <VideoReviewList
        videoId="v1"
        reviews={reviews}
        loading={false}
        error={null}
        reload={async () => {}}
      />
    </SnackbarProvider>,
  );
}

describe('review sections', () => {
  it('gives review requests their own section and count', () => {
    const { container } = renderRequests([request(), request({ id: 'req-2', requestNote: null })]);

    expect(container.querySelector('.video-reviews-list-header h2')?.textContent).toBe(
      'Review requests',
    );
    expect(container.querySelector('.vr-list-count')?.textContent).toBe('2');
    expect(container.textContent).toContain('Please look at the toss');
    // Requests never render review rows.
    expect(container.querySelector('#vr-item-rev-1')).toBeNull();
  });

  it('gives reviews their own section and count', () => {
    const { container } = renderReviews([review(), review({ id: 'rev-2', text: 'Second note' })]);

    expect(container.querySelector('.video-reviews-list-header h2')?.textContent).toBe('Reviews');
    expect(container.querySelector('.vr-list-count')?.textContent).toBe('2');
    expect(container.textContent).toContain('Keep the elbow up');
    // A review that happens to carry a request note does not turn into a request row.
    expect(container.querySelector('.vr-req-status')).toBeNull();
  });

  it('collapses each section on its own', () => {
    const { container } = renderRequests([request()]);

    const header = container.querySelector('.video-reviews-list-header')!;
    expect(header.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.vr-list')).toBeNull();
    expect(container.textContent).not.toContain('Please look at the toss');
  });

  it('shows an empty state per section', () => {
    expect(renderRequests([]).container.textContent).toContain('No review requests.');
    expect(renderReviews([]).container.textContent).toContain('No reviews yet.');
  });
});
