import { converter, formatHex, parse } from "culori";

const toOklch = converter("oklch");

export type Shade =
  50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export const SHADES: Shade[] = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
];

/**
 * Target lightness per shade in OKLCH space. Tuned to feel even across the ramp
 * and to match the perceptual spacing of well-known palettes (Tailwind, Radix).
 */
const LIGHTNESS: Record<Shade, number> = {
  50: 0.971,
  100: 0.936,
  200: 0.885,
  300: 0.808,
  400: 0.704,
  500: 0.637,
  600: 0.577,
  700: 0.505,
  800: 0.444,
  900: 0.396,
  950: 0.262,
};

/** Chroma multiplier per shade — muted at the extremes, fullest mid-ramp. */
const CHROMA_SCALE: Record<Shade, number> = {
  50: 0.18,
  100: 0.3,
  200: 0.5,
  300: 0.72,
  400: 0.92,
  500: 1,
  600: 1,
  700: 0.92,
  800: 0.82,
  900: 0.74,
  950: 0.5,
};

/**
 * Build a 50–950 color ramp from a single base color.
 * The base color's hue is preserved; lightness and chroma follow the curves above.
 */
export function generateScale(baseColor: string): Record<Shade, string> {
  const parsed = parse(baseColor);
  if (!parsed) {
    throw new Error(`Invalid color: ${baseColor}`);
  }
  const base = toOklch(parsed);
  const hue = base.h ?? 0;
  const baseChroma = base.c ?? 0;

  const out = {} as Record<Shade, string>;
  for (const shade of SHADES) {
    const l = LIGHTNESS[shade];
    const c = Math.min(baseChroma * CHROMA_SCALE[shade] * 1.15, 0.37);
    out[shade] = formatHex({ mode: "oklch", l, c, h: hue }) ?? baseColor;
  }
  return out;
}

/** Pick readable foreground (near-black or near-white) for a given background. */
export function readableForeground(bg: string): string {
  const c = toOklch(parse(bg)!);
  return (c.l ?? 0) > 0.62 ? "#0b0b0c" : "#ffffff";
}
