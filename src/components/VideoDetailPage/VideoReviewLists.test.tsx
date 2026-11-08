import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VideoReview, VideoReviewRequest } from '../../api/api.videos';
import { SnackbarProvider } from '../common';
import { VideoReviewList } from './VideoReviewList';

/**
 * The Reviews section owns the request affordance: a "Request review" action in
 * its header, and ONE banner whenever a request is still waiting on a review.
 * Finished requests are history and are not shown.
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

function renderReviews(
  reviews: VideoReview[],
  requests: VideoReviewRequest[] = [],
  onRequestReview?: () => void,
) {
  return render(
    <SnackbarProvider>
      <VideoReviewList
        videoId="v1"
        reviews={reviews}
        requests={requests}
        loading={false}
        error={null}
        reload={async () => {}}
        onRequestReview={onRequestReview}
      />
    </SnackbarProvider>,
  );
}

describe('reviews section', () => {
  it('lists the reviews with their count', () => {
    const { container } = renderReviews([review(), review({ id: 'rev-2', text: 'Second note' })]);

    expect(container.querySelector('.video-reviews-list-header h2')?.textContent).toBe('Reviews');
    expect(container.querySelector('.vr-list-count')?.textContent).toBe('2');
    expect(container.querySelectorAll('.vr-list li')).toHaveLength(2);
    expect(container.textContent).toContain('Keep the elbow up');
  });

  it('puts the request action in the header, outside the toggle', () => {
    const onRequestReview = vi.fn();
    const { container } = renderReviews([], [], onRequestReview);

    const action = container.querySelector('.video-reviews-list-header > button.secondary-btn')!;
    expect(action.getAttribute('aria-label')).toBe('Request review');
    fireEvent.click(action);
    expect(onRequestReview).toHaveBeenCalledTimes(1);
    // Acting on the section must not also collapse it.
    expect(container.querySelector('.video-section-toggle')?.getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('puts the collapse caret at the end of the row, after the action', () => {
    const { container } = renderReviews([review()], [], () => {});

    const header = container.querySelector('.video-reviews-list-header')!;
    const caret = header.lastElementChild!;
    expect(caret.className).toContain('video-section-chevron');

    fireEvent.click(caret);
    expect(container.querySelector('.video-section-toggle')?.getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(container.querySelector('.vr-list')).toBeNull();
  });

  it('shows the open requests as cards above the reviews', () => {
    const { container } = renderReviews([review()], [
      request(),
      request({ id: 'req-2', requestNote: null }),
    ]);

    const cards = container.querySelectorAll('.vr-request-list li');
    expect(cards).toHaveLength(2);
    // The request cards sit above the review list, inside the section.
    expect(
      container.querySelector('.vr-request-list')!.compareDocumentPosition(
        container.querySelector('.vr-list:not(.vr-request-list)')!,
      ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    // An unlabeled rule separates the two groups so they don't read alike.
    const divider = container.querySelector('.vr-group-divider')!;
    expect(divider.tagName).toBe('HR');
    expect(divider.textContent).toBe('');
    expect(
      container.querySelector('.vr-request-list')!.compareDocumentPosition(divider),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders an open request as the old request row', () => {
    const { container } = renderReviews([review()], [request()]);

    const card = container.querySelector('.vr-request-list li')!;
    expect(card.textContent).toContain('Ada Ng');
    expect(card.textContent).toContain('Open');
    expect(card.textContent).toContain('Please look at the toss');
    // The note is quoted, so it reads as the requester's own words.
    expect(card.querySelector('.vr-request-note')?.tagName).toBe('BLOCKQUOTE');
    // The delete control the old row had is back.
    expect(card.querySelector('.vr-delete')?.getAttribute('title')).toBe('Delete request');
  });

  it('names the reviewer the request was sent to', () => {
    const { container } = renderReviews([review()], [
      request({
        requestedReviewer: { id: 'u3', email: 'sam@x.com', firstName: 'Sam', lastName: 'Lee' },
      }),
    ]);

    const target = container.querySelector('.vr-request-target')!;
    expect(target.textContent).toContain('Review requested from');
    expect(target.textContent).toContain('Sam Lee');
  });

  it('names the entity the request was sent to', () => {
    const { container } = renderReviews([review()], [
      request({
        requestedEntity: { id: 'e1', name: 'Riverside Tennis' },
        requestedEntityId: 'e1',
      }),
    ]);

    const target = container.querySelector('.vr-request-target')!;
    expect(target.textContent).toContain('Review requested from');
    expect(target.textContent).toContain('Riverside Tennis');
    expect(target.querySelector('.vr-request-entity-mark')?.textContent).toBe('R');
  });

  it('says the request is open to anyone when it names no target', () => {
    const { container } = renderReviews([review()], [request()]);

    expect(container.querySelector('.vr-request-target')?.textContent).toContain(
      'anyone with access',
    );
  });

  it('shows no request cards for finished requests (no history)', () => {
    const { container } = renderReviews([review()], [
      request({ status: 'Done' }),
      request({ id: 'req-2', status: 'Done' }),
    ]);

    expect(container.querySelector('.vr-request-list')).toBeNull();
    expect(container.textContent).not.toContain('Please look at the toss');
  });

  it('shows an empty state when there are no reviews', () => {
    expect(renderReviews([]).container.textContent).toContain('No reviews yet.');
  });
});
