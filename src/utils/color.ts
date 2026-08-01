/**
 * Deterministic color utilities — ported from a Dart Flutter extension.
 *
 * Derives a stable hex color from an arbitrary string (e.g. a person's name)
 * using a djb2-style hash, plus HSL-based darken/lighten helpers.
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = parseInt(h, 16);
  if (Number.isNaN(int)) return { r: 0, g: 0, b: 0 };
  return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff };
}

function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }: HSL): RGB {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (p0: number, q0: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p0 + (q0 - p0) * 6 * tt;
    if (tt < 1 / 2) return q0;
    if (tt < 2 / 3) return p0 + (q0 - p0) * (2 / 3 - tt) * 6;
    return p0;
  };
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/** Perceived lightness in the 0.0–1.0 range (0 = black, 1 = white). */
export function getLuminance(hex: string): number {
  return rgbToHsl(hexToRgb(hex)).l;
}

/** Decreases lightness by `amount` (clamped to a valid range). */
export function darken(hex: string, amount = 0.1): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: clamp(hsl.l - amount, 0, 1) }));
}

/** Increases lightness by `amount` (clamped to a valid range). */
export function lighten(hex: string, amount = 0.1): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: clamp(hsl.l + amount, 0, 1) }));
}

interface ColorForOptions {
  /** Darkens light colors so white text stays readable. */
  forceDark?: boolean;
  /** Lightens dark colors so black text stays readable. */
  forceLight?: boolean;
}

/**
 * Picks a deterministic hex color based on a string (e.g. a person's name).
 *
 * - `forceDark: true`  -> darkens light colors so white text stays readable
 * - `forceLight: true` -> lightens dark colors so black text stays readable
 */
export function colorFor(text: string, { forceDark = false, forceLight = false }: ColorForOptions = {}): string {
  // djb2-style string hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const finalHash = Math.abs(hash) % (256 * 256 * 256);
  const red = (finalHash & 0xff0000) >> 16;
  const green = (finalHash & 0xff00) >> 8;
  const blue = finalHash & 0xff;
  const color = rgbToHex({ r: red, g: green, b: blue });

  if (forceDark) {
    const luminance = getLuminance(color);
    if (luminance > 0.5) return darken(color, luminance - 0.4);
  }

  if (forceLight) {
    const luminance = getLuminance(color);
    if (luminance < 0.5) return lighten(color, luminance + 0.4);
  }

  return color;
}
