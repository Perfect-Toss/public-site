/**
 * Image helpers for turning arbitrary uploads into a predictable asset.
 */

/** Every logo is stored as a square of this many pixels per side. */
export const LOGO_SIZE = 512;

/** Profile photos are stored as a square of this many pixels per side. */
export const AVATAR_SIZE = 512;

/** JPEG quality for profile photos. */
const AVATAR_QUALITY = 0.9;

/**
 * Painted under the artwork. A stored logo is opaque, because a transparent
 * one turns black the moment anything down the line drops the alpha channel.
 */
export const LOGO_BACKGROUND = '#ffffff';

/** Largest side scanned when measuring a logo's content box. */
const MAX_SCAN_SIDE = 1024;

/** Alpha at or below this counts as empty space, not content. */
const ALPHA_THRESHOLD = 10;

/**
 * File-picker filter for photos and logos. `image/*` does the real work — it is
 * also what makes phones offer the camera and the photo library — and the
 * extensions are only here because Windows hides files from the dialog when it
 * has no MIME mapping for them.
 */
export const IMAGE_ACCEPT = [
  'image/*',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.svg',
].join(',');

/** Extensions accepted even when the OS reports no MIME type for the file. */
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg']);

/**
 * Formats the picker does not offer: no common browser draws them, so they
 * would only fail once the file is read. HEIC is the one that matters — iPhones
 * hand it over as bytes Chromium and Firefox cannot decode.
 */
const UNDECODABLE_EXTENSIONS = new Set(['heic', 'heif', 'tif', 'tiff']);
const UNDECODABLE_TYPES = new Set(['image/heic', 'image/heif', 'image/tif', 'image/tiff']);

/**
 * Whether a picked file is a usable image. Some platforms hand over an empty
 * MIME type for the less common extensions, so the file name is checked as
 * well. This says nothing about whether the browser can DECODE the format.
 */
export function isImageFile(file: File): boolean {
  const dot = file.name.lastIndexOf('.');
  const extension = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : '';

  // `image/*` would wave these through, and they cannot be turned into pixels.
  if (UNDECODABLE_EXTENSIONS.has(extension) || UNDECODABLE_TYPES.has(file.type)) return false;

  if (file.type.startsWith('image/')) return true;
  return IMAGE_EXTENSIONS.has(extension);
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where a source rectangle lands when scaled to fit inside a square, centred
 * and keeping its aspect ratio. Never crops: one axis ends up with padding.
 */
export function fitWithin(source: { width: number; height: number }, size: number): Rect {
  const scale = Math.min(size / source.width, size / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  return {
    x: Math.round((size - width) / 2),
    y: Math.round((size - height) / 2),
    width,
    height,
  };
}

/**
 * Bounding box of the pixels that carry any opacity, which drops the empty
 * margin a logo was exported with. A fully transparent image keeps its full box.
 */
export function opaqueBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Rect {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < 0) return { x: 0, y: 0, width, height };
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * The centred square a browser's `object-fit: cover` would show, which is what
 * the avatar already displays.
 */
export function coverSquare(source: { width: number; height: number }): Rect {
  const side = Math.min(source.width, source.height);
  return {
    x: Math.round((source.width - side) / 2),
    y: Math.round((source.height - side) / 2),
    width: side,
    height: side,
  };
}

/**
 * Reads a photo and returns a square, opaque JPEG — the same crop the avatar
 * already shows, so nothing visible is lost and any format the browser can draw
 * ends up renderable everywhere. Animated GIFs pass through untouched, because
 * a canvas would freeze them on one frame.
 */
export async function normalizeAvatarImage(file: File, size = AVATAR_SIZE): Promise<File> {
  if (file.type === 'image/gif') return file;

  const image = await loadImage(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error('This image has no size.');

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot resize images.');

  // Opaque: the avatar clips to a circle, so the corners never show.
  context.fillStyle = LOGO_BACKGROUND;
  context.fillRect(0, 0, size, size);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const crop = coverSquare({ width, height });
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size);

  const blob = await toBlob(canvas, 'image/jpeg', AVATAR_QUALITY);
  return new File([blob], `${baseName(file.name)}.jpg`, { type: 'image/jpeg' });
}

/**
 * Reads an image file and returns a PNG of a `size`-square canvas: the artwork
 * is trimmed of its empty margin, scaled to fill the square (up as well as
 * down) and centred, so aspect ratio is kept and nothing is cropped.
 */
export async function normalizeLogoImage(
  file: File,
  options: { size?: number; background?: string | null } = {},
): Promise<File> {
  const { size = LOGO_SIZE, background = LOGO_BACKGROUND } = options;
  const image = await loadImage(file);
  const content = contentBounds(image);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot resize images.');

  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, size, size);
  }

  const target = fitWithin(content, size);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    content.x,
    content.y,
    content.width,
    content.height,
    target.x,
    target.y,
    target.width,
    target.height,
  );

  const blob = await toBlob(canvas, 'image/png');
  return new File([blob], `${baseName(file.name)}.png`, { type: 'image/png' });
}

/** Loads a file into an image element, so SVG and every bitmap format decode the same way. */
function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file is not an image.'));
    };
    image.src = url;
  });
}

/** The image's non-empty area, measured on a downscaled copy and mapped back. */
function contentBounds(image: HTMLImageElement): Rect {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  // Without a size there is nothing to scale: better to refuse the file than to
  // stretch one sampled pixel across the whole square.
  if (!width || !height) throw new Error('This image has no size.');

  const scale = Math.min(1, MAX_SCAN_SIDE / Math.max(width, height));
  const scanWidth = Math.max(1, Math.round(width * scale));
  const scanHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = scanWidth;
  canvas.height = scanHeight;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { x: 0, y: 0, width, height };

  context.drawImage(image, 0, 0, scanWidth, scanHeight);

  let data: Uint8ClampedArray;
  try {
    data = context.getImageData(0, 0, scanWidth, scanHeight).data;
  } catch {
    // A canvas that cannot be read still gives useful pixels for the resize.
    return { x: 0, y: 0, width, height };
  }

  const bounds = opaqueBounds(data, scanWidth, scanHeight);
  return {
    x: Math.floor(bounds.x / scale),
    y: Math.floor(bounds.y / scale),
    width: Math.min(width, Math.ceil(bounds.width / scale)),
    height: Math.min(height, Math.ceil(bounds.height / scale)),
  };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not process this image.'));
      },
      type,
      quality,
    );
  });
}

function baseName(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name || 'logo';
}
