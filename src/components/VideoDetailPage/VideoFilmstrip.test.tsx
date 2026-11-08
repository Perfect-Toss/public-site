import { describe, expect, it, vi } from 'vitest';

import { VideoFilmstrip } from './VideoFilmstrip';
import { render } from '@testing-library/react';

/**
 * Base scrubber contract:
 * 1. the playhead sits exactly under the pointer (time maps 1:1 over the bar);
 * 2. while PAUSED, hovering the bar seeks to the pointer;
 * 3. while PLAYING, hovering does nothing — only a click/press seeks.
 */

const BAR_WIDTH = 1000;
const DURATION = 10;

/** jsdom has no PointerEvent: dispatch a bubbling event carrying the pointer fields. */
function pointer(
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  el: Element,
  clientX: number,
) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'clientX', { value: clientX });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  el.dispatchEvent(event);
}

/** Run a callback with a 1000px-wide bar and pointer capture stubbed. */
function withBar(run: () => void) {
  const rect = {
    left: 0,
    top: 0,
    right: BAR_WIDTH,
    bottom: 20,
    width: BAR_WIDTH,
    height: 20,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
  const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect);
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => BAR_WIDTH,
  });
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  });
  try {
    run();
  } finally {
    rectSpy.mockRestore();
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).setPointerCapture;
  }
}

describe('VideoFilmstrip scrub contract', () => {
  it('seeks to exactly the time under the pointer across the whole bar', () => {
    const seeks: number[] = [];
    withBar(() => {
      const { container } = render(
        <VideoFilmstrip durationFallback={DURATION} currentTime={0} onSeek={(s) => seeks.push(s)} />,
      );
      const bar = container.querySelector('.video-filmstrip')!;
      // Both edges and the interior — no gutter, no offset.
      for (const clientX of [0, 250, 500, 750, 1000]) {
        pointer('pointerdown', bar, clientX);
      }
    });
    expect(seeks).toEqual([0, 2.5, 5, 7.5, DURATION]);
  });

  it('draws the playhead at exactly the pointer position for that time', () => {
    const cases: Array<[number, string]> = [
      [0, 'left: 0%'],
      [2.5, 'left: 25%'],
      [5, 'left: 50%'],
      [7.5, 'left: 75%'],
      [DURATION, 'left: 100%'],
    ];
    for (const [currentTime, expected] of cases) {
      const { container, unmount } = render(
        <VideoFilmstrip durationFallback={DURATION} currentTime={currentTime} onSeek={() => {}} />,
      );
      expect(container.querySelector('.vf-playhead')?.getAttribute('style')).toContain(expected);
      unmount();
    }
  });

  it('seeks on hover while paused', () => {
    const seeks: number[] = [];
    withBar(() => {
      const { container } = render(
        <VideoFilmstrip durationFallback={DURATION} currentTime={0} onSeek={(s) => seeks.push(s)} />,
      );
      pointer('pointermove', container.querySelector('.video-filmstrip')!, 500);
    });
    expect(seeks).toEqual([5]);
  });

  it('does not seek on hover while playing, but does when pressed', () => {
    const seeks: number[] = [];
    withBar(() => {
      const { container } = render(
        <VideoFilmstrip
          durationFallback={DURATION}
          currentTime={0}
          onSeek={(s) => seeks.push(s)}
          isPlaying
        />,
      );
      const bar = container.querySelector('.video-filmstrip')!;

      pointer('pointermove', bar, 500);
      expect(seeks).toEqual([]);

      pointer('pointerdown', bar, 500);
      expect(seeks).toEqual([5]);
    });
  });

  it('keeps seeking while dragging during playback', () => {
    const seeks: number[] = [];
    withBar(() => {
      const { container } = render(
        <VideoFilmstrip
          durationFallback={DURATION}
          currentTime={0}
          onSeek={(s) => seeks.push(s)}
          isPlaying
        />,
      );
      const bar = container.querySelector('.video-filmstrip')!;

      pointer('pointerdown', bar, 100);
      pointer('pointermove', bar, 300);
      pointer('pointermove', bar, 900);
      pointer('pointerup', bar, 900);

      expect(seeks).toEqual([1, 3, 9]);
    });
  });

  it('draws review markers inside the bar, and a press on one still scrubs and clicks', () => {
    const seeks: number[] = [];
    const clicks: string[] = [];
    withBar(() => {
      const { container } = render(
        <VideoFilmstrip durationFallback={DURATION} currentTime={0} onSeek={(s) => seeks.push(s)}>
          <button type="button" onClick={() => clicks.push('marker')}>
            marker
          </button>
        </VideoFilmstrip>,
      );
      // The marker rail lives inside the scrub bar, not in a strip of its own.
      expect(container.querySelector('.vf-overlay button')).not.toBeNull();

      const marker = container.querySelector('button')!;
      pointer('pointerdown', marker, 250);
      marker.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    // The bar scrubbed to the pointer AND the marker still got its click.
    expect(seeks).toEqual([2.5]);
    expect(clicks).toEqual(['marker']);
  });
});
