import { describe, expect, it } from 'vitest';

import { MAX_ZOOM, clampZoom, zoomAt } from './useVideoZoom';

const W = 1000;
const H = 500;
const NONE = { scale: 1, x: 0, y: 0 };

describe('video zoom math', () => {
  it('keeps the point under the pointer fixed while zooming', () => {
    const z = zoomAt(NONE, 2, 300, 200, W, H);
    // The picture point that was at (300, 200) is still drawn at (300, 200).
    expect(300 * z.scale + z.x).toBeCloseTo(300);
    expect(200 * z.scale + z.y).toBeCloseTo(200);
  });

  it('never zooms out past the unzoomed picture, and resets the pan there', () => {
    const zoomed = zoomAt(NONE, 3, 900, 400, W, H);
    expect(zoomAt(zoomed, 0.5, 100, 100, W, H)).toEqual(NONE);
  });

  it('caps the zoom level', () => {
    expect(zoomAt(NONE, 100, 500, 250, W, H).scale).toBe(MAX_ZOOM);
  });

  it('never pans past the edge of the picture', () => {
    expect(clampZoom({ scale: 2, x: 50, y: 50 }, W, H)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(clampZoom({ scale: 2, x: -5000, y: -5000 }, W, H)).toEqual({
      scale: 2,
      x: -W,
      y: -H,
    });
  });
});
