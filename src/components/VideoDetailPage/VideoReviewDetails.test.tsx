import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VideoReview } from '../../api/api.videos';
import { SnackbarProvider } from '../common';
import { VideoReviewDetails } from './VideoReviewDetails';

// The content URL and playback have their own tests; here they must resolve deterministically.
const { toggleMock, seekMock } = vi.hoisted(() => ({ toggleMock: vi.fn(), seekMock: vi.fn() }));
vi.mock('./reviewContent', () => ({
  useReviewContentUrl: () => ({ url: 'https://blob/item?sas', onError: () => {} }),
  useReviewAudioPlayer: () => ({ playing: true, currentTime: 3, duration: 12 }),
  toggleReviewAudio: toggleMock,
  seekReviewAudio: seekMock,
}));

function review(overrides: Partial<VideoReview> = {}): VideoReview {
  return {
    id: 'r1',
    timestamp: '00:00:05',
    text: 'Keep the elbow up',
    createdByUser: { id: 'u1', firstName: 'Sam', lastName: 'Lee' },
    ...overrides,
  };
}

function renderDetails(props: Parameters<typeof VideoReviewDetails>[0]) {
  return render(
    <SnackbarProvider>
      <VideoReviewDetails {...props} />
    </SnackbarProvider>,
  );
}

/**
 * The marker preview and the review list render THIS component, so a review can
 * never look different depending on where it appears.
 */
describe('VideoReviewDetails', () => {
  it('shows the reviewer, the position and the comment', () => {
    const { container } = renderDetails({ review: review() });

    expect(container.textContent).toContain('Sam Lee');
    expect(container.textContent).toContain('0:05.0');
    expect(container.textContent).toContain('Keep the elbow up');
  });

  it('shows a segment as a range', () => {
    const { container } = renderDetails({ review: review({ duration: '00:00:03' }) });

    expect(container.textContent).toContain('0:05.0 – 0:08.0');
  });

  it('labels a voice note in the preview, and gives the list a full scrubber', () => {
    const preview = renderDetails({ review: review({ contentKind: 'Audio', text: null }) });
    expect(preview.container.textContent).toContain('Voice note');
    expect(preview.container.querySelector('.vr-audio')).toBeNull();
    preview.unmount();

    const list = renderDetails({
      review: review({ contentKind: 'Audio', text: null }),
      audioPlayer: true,
    });
    // Play/pause, a seek bar and the clock — all bound to the ONE shared element.
    expect(list.container.querySelector('button.vr-audio-play')).not.toBeNull();
    const seek = list.container.querySelector<HTMLInputElement>('input.vr-audio-seek');
    expect(seek?.max).toBe('12');
    expect(list.container.querySelector('.vr-audio-time')?.textContent).toBe('0:03 / 0:12');
    // Never a second media element (that was the duplicate download).
    expect(list.container.querySelector('audio')).toBeNull();
  });

  it('falls back to the transcript when the note has no text', () => {
    const { container } = renderDetails({
      review: review({ contentKind: 'Audio', text: null, transcript: 'Spoken comment' }),
    });

    expect(container.textContent).toContain('Spoken comment');
  });

  it('shows a drawing overlay', () => {
    const { container } = renderDetails({ review: review({ contentKind: 'Drawing' }) });
    const drawing = container.querySelector('img.vr-details-drawing');

    expect(drawing).not.toBeNull();
    expect(drawing?.getAttribute('src')).toBe('https://blob/item?sas');
  });
});
