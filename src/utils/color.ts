/**
 * Generic color utilities — ported from a Dart Flutter extension.
 *
 * `colorFor` derives a stable hex color from an arbitrary string (e.g. a
 * person's name) using the same hash, RGB extraction, and optional
 * force-dark / force-light luminance adjustments as the Flutter app.
 * `isLightColor` helps pick readable text (black vs white) over a color.
 */

export interface ColorForOptions {
  /** Darkens light colors so white text stays readable. */
  forceDark?: boolean;
  /** Lightens dark colors so black text stays readable. */
  forceLight?: boolean;
}

/**
 * Deterministically generate a hex color from a string (e.g. a user's name),
 * mirroring the Dart `colorFor` implementation: the same string hash, the same
 * RGB extraction from the hashed value, and the same optional force-dark /
 * force-light luminance adjustments. The same input always yields the same
 * color, so it can be used as an avatar fallback when a user has no `colorHex`.
 */
export function colorFor(text: string, options?: ColorForOptions): string {
  const { forceDark = false, forceLight = false } = options ?? {};

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const finalHash = Math.abs(hash) % (256 * 256 * 256);
  const red = (finalHash & 0xff0000) >> 16;
  const green = (finalHash & 0xff00) >> 8;
  const blue = finalHash & 0xff;

  if (forceDark) {
    const luminance = relativeLuminance(red, green, blue);
    if (luminance > 0.5) {
      const amount = luminance - 0.4;
      return rgbToHex(
        Math.round(red * (1 - amount)),
        Math.round(green * (1 - amount)),
        Math.round(blue * (1 - amount)),
      );
    }
  }

  if (forceLight) {
    const luminance = relativeLuminance(red, green, blue);
    if (luminance < 0.5) {
      const amount = luminance + 0.4;
      return rgbToHex(
        Math.round(red + (255 - red) * amount),
        Math.round(green + (255 - green) * amount),
        Math.round(blue + (255 - blue) * amount),
      );
    }
  }

  return rgbToHex(red, green, blue);
}

/**
 * Perceived brightness (W3C formula). Returns true for "light" colors so
 * callers can pick dark text over them (e.g. on avatars).
 */
export function isLightColor(hex?: string | null): boolean {
  if (!hex) return false;
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived brightness (W3C formula)
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}

/** Convert a `#rrggbb` hex color to an `rgba()` string with the given alpha. */
export function hexToRgba(hex: string | null | undefined, alpha: number): string {
  const c = (hex ?? '').replace('#', '');
  if (c.length < 6) return `rgba(255, 255, 255, ${alpha})`;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Opaque mix of `hex` towards white: `strength` 0 is white, 1 is `hex`. Used to
 * derive a pale solid tint from a colour without relying on alpha.
 */
export function tintColor(hex: string | null | undefined, strength: number): string {
  const c = (hex ?? '').replace('#', '');
  if (c.length < 6) return '#ffffff';
  const mix = (channel: string) => {
    const value = parseInt(channel, 16);
    return Math.round(value + (255 - value) * (1 - strength));
  };
  return rgbToHex(mix(c.substring(0, 2)), mix(c.substring(2, 4)), mix(c.substring(4, 6)));
}

/** Lightness a too-pale colour is pulled down to when it has to carry text. */
const INK_LIGHTNESS = 0.3;

/**
 * The colour to write text in over white: `hex` itself when it is dark enough,
 * otherwise the same hue and saturation dropped to a readable lightness — a
 * pastel stays recognisably pink rather than turning grey.
 */
export function inkColor(hex: string | null | undefined): string {
  const c = (hex ?? '').replace('#', '');
  if (c.length < 6) return '#000000';
  if (!isLightColor(c)) return `#${c.toLowerCase()}`;

  const [hue, saturation] = rgbToHsl(
    parseInt(c.substring(0, 2), 16) / 255,
    parseInt(c.substring(2, 4), 16) / 255,
    parseInt(c.substring(4, 6), 16) / 255,
  );
  const [r, g, b] = hslToRgb(hue, saturation, INK_LIGHTNESS);
  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

/** sRGB relative luminance, matching Dart's `Color.getLuminance()`. */
function relativeLuminance(r: number, g: number, b: number): number {
  const linearize = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Convert RGB channels (0-255) to a hex string (#rrggbb). */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Hue (0-1), saturation (0-1) and lightness (0-1) of an RGB colour. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue: number;
  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  return [hue / 6, saturation, lightness];
}

/** RGB channels (0-1) for a hue, saturation and lightness (all 0-1). */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };

  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

