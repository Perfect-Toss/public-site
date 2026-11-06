import {
  IMAGE_ACCEPT,
  coverSquare,
  fitWithin,
  isImageFile,
  opaqueBounds,
} from './image';
import { describe, expect, it } from 'vitest';

/** Builds RGBA data from a grid of alpha values ('#' = opaque, '.' = empty). */
function alphaGrid(rows: string[], size = 4): Uint8ClampedArray {
  const data = new Uint8ClampedArray(rows.length * size * 4);
  rows.forEach((row, y) => {
    Array.from(row).forEach((cell, x) => {
      const offset = (y * size + x) * 4;
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = cell === '#' ? 255 : 0;
    });
  });
  return data;
}

describe('fitWithin', () => {
  it('pads a wide image top and bottom', () => {
    expect(fitWithin({ width: 400, height: 100 }, 512)).toEqual({
      x: 0,
      y: 192,
      width: 512,
      height: 128,
    });
  });

  it('pads a tall image left and right', () => {
    expect(fitWithin({ width: 100, height: 200 }, 512)).toEqual({
      x: 128,
      y: 0,
      width: 256,
      height: 512,
    });
  });

  it('leaves a square image flush with the edges', () => {
    expect(fitWithin({ width: 64, height: 64 }, 512)).toEqual({
      x: 0,
      y: 0,
      width: 512,
      height: 512,
    });
  });

  it('never returns a zero side', () => {
    const rect = fitWithin({ width: 4000, height: 1 }, 512);
    expect(rect.width).toBe(512);
    expect(rect.height).toBeGreaterThanOrEqual(1);
  });
});

describe('coverSquare', () => {
  it('keeps a square source whole', () => {
    expect(coverSquare({ width: 800, height: 800 })).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 800,
    });
  });

  it('crops the sides of a landscape photo, centred', () => {
    expect(coverSquare({ width: 1200, height: 800 })).toEqual({
      x: 200,
      y: 0,
      width: 800,
      height: 800,
    });
  });

  it('crops the top and bottom of a portrait photo, centred', () => {
    expect(coverSquare({ width: 600, height: 1000 })).toEqual({
      x: 0,
      y: 200,
      width: 600,
      height: 600,
    });
  });
});

describe('isImageFile', () => {
  const fileOf = (name: string, type: string) => new File(['x'], name, { type });

  it('accepts anything the OS labels as an image', () => {
    expect(isImageFile(fileOf('logo.png', 'image/png'))).toBe(true);
    expect(isImageFile(fileOf('shot.webp', 'image/webp'))).toBe(true);
  });

  it('falls back to the extension when the OS reports no type', () => {
    expect(isImageFile(fileOf('crest.PNG', ''))).toBe(true);
    expect(isImageFile(fileOf('shot.webp', ''))).toBe(true);
    expect(isImageFile(fileOf('mark.svg', 'application/octet-stream'))).toBe(true);
  });

  it('rejects files that are not images', () => {
    expect(isImageFile(fileOf('notes.txt', 'text/plain'))).toBe(false);
    expect(isImageFile(fileOf('contract.pdf', 'application/pdf'))).toBe(false);
    expect(isImageFile(fileOf('no-extension', ''))).toBe(false);
  });

  it('rejects formats no browser can decode, however they are labelled', () => {
    expect(isImageFile(fileOf('IMG_0001.HEIC', 'image/heic'))).toBe(false);
    expect(isImageFile(fileOf('IMG_0001.heic', ''))).toBe(false);
    expect(isImageFile(fileOf('scan.tiff', 'image/tiff'))).toBe(false);
  });
});

describe('IMAGE_ACCEPT', () => {
  it('leads with the wildcard so phones still offer camera and gallery', () => {
    const tokens = IMAGE_ACCEPT.split(',');

    expect(tokens[0]).toBe('image/*');
    expect(tokens).toContain('.svg');
    expect(tokens).toContain('.webp');
  });

  it('stays off formats no browser can draw', () => {
    expect(IMAGE_ACCEPT).not.toContain('.heic');
    expect(IMAGE_ACCEPT).not.toContain('.tiff');
    expect(IMAGE_ACCEPT).not.toContain('.psd');
  });
});

describe('opaqueBounds', () => {
  it('drops the empty margin around the artwork', () => {
    const data = alphaGrid([
      '....',
      '.##.',
      '.##.',
      '....',
    ]);

    expect(opaqueBounds(data, 4, 4)).toEqual({ x: 1, y: 1, width: 2, height: 2 });
  });

  it('treats a fully opaque grid as having no margin', () => {
    const data = alphaGrid([
      '####',
      '####',
      '####',
      '####',
    ]);

    expect(opaqueBounds(data, 4, 4)).toEqual({ x: 0, y: 0, width: 4, height: 4 });
  });

  it('keeps the full box when nothing is visible', () => {
    const data = alphaGrid([
      '....',
      '....',
      '....',
      '....',
    ]);

    expect(opaqueBounds(data, 4, 4)).toEqual({ x: 0, y: 0, width: 4, height: 4 });
  });

  it('ignores nearly invisible edges', () => {
    const data = alphaGrid([
      '....',
      '.##.',
      '....',
      '....',
    ]);
    // A single alpha-4 pixel is below the threshold, so it is not content.
    data[(1 * 4 + 0) * 4 + 3] = 4;

    expect(opaqueBounds(data, 4, 4)).toEqual({ x: 1, y: 1, width: 2, height: 1 });
  });
});
