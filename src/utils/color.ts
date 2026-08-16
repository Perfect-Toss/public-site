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

