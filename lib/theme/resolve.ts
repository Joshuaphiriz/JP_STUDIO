import { formatHex } from "culori";
import { generateScale, readableForeground, SHADES } from "./palette";
import {
  DENSITY_SCALE,
  FONT_OPTIONS,
  type ThemeConfig,
  themeConfigSchema,
} from "./types";

function neutral(l: number, hue: number, chroma: number): string {
  return formatHex({ mode: "oklch", l, c: chroma, h: hue }) ?? "#808080";
}

/** Semantic surface/text/border tokens for one mode. */
function semanticLayer(cfg: ThemeConfig, mode: "light" | "dark") {
  const h = cfg.grayHue;
  const c = cfg.grayChroma;
  if (mode === "light") {
    return {
      "--surface-0": "#ffffff",
      "--surface-1": neutral(0.985, h, c),
      "--surface-2": neutral(0.965, h, c),
      "--surface-3": neutral(0.94, h, c),
      "--surface-inset": neutral(0.975, h, c),
      "--text-primary": neutral(0.22, h, c * 2),
      "--text-secondary": neutral(0.44, h, c * 2),
      "--text-tertiary": neutral(0.58, h, c * 1.5),
      "--text-ghost": neutral(0.72, h, c),
      "--border": neutral(0.9, h, c),
      "--border-strong": neutral(0.83, h, c),
      "--overlay": "oklch(0.2 0 0 / 0.4)",
      "--material": "oklch(1 0 0 / 0.72)",
    };
  }
  return {
    "--surface-0": neutral(0.16, h, c),
    "--surface-1": neutral(0.19, h, c),
    "--surface-2": neutral(0.23, h, c),
    "--surface-3": neutral(0.28, h, c),
    "--surface-inset": neutral(0.145, h, c),
    "--text-primary": neutral(0.97, h, c),
    "--text-secondary": neutral(0.78, h, c),
    "--text-tertiary": neutral(0.62, h, c),
    "--text-ghost": neutral(0.48, h, c),
    "--border": neutral(0.32, h, c),
    "--border-strong": neutral(0.42, h, c),
    "--overlay": "oklch(0 0 0 / 0.6)",
    "--material": "oklch(0.2 0 0 / 0.66)",
  };
}

/** Fixed status colors — intentionally not themeable. */
const STATUS = {
  "--success": "#34C759",
  "--success-soft": "#E7F8EC",
  "--warning": "#FF9F0A",
  "--warning-soft": "#FFF4E1",
  "--error": "#FF3B30",
  "--error-soft": "#FDE9E8",
  "--info": "#0A84FF",
  "--info-soft": "#E5F1FF",
};

const MOTION = {
  "--ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
  "--ease-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
  "--ease-in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
  "--dur-fast": "150ms",
  "--dur-base": "220ms",
  "--dur-slow": "360ms",
};

function shadowSet(intensity: number) {
  const a = (base: number) => +(base * intensity).toFixed(3);
  return {
    "--shadow-xs": `0 1px 2px oklch(0 0 0 / ${a(0.12)})`,
    "--shadow-sm": `0 1px 3px oklch(0 0 0 / ${a(0.14)}), 0 1px 2px oklch(0 0 0 / ${a(0.1)})`,
    "--shadow-md": `0 4px 12px oklch(0 0 0 / ${a(0.14)}), 0 2px 4px oklch(0 0 0 / ${a(0.08)})`,
    "--shadow-lg": `0 12px 32px oklch(0 0 0 / ${a(0.18)}), 0 4px 8px oklch(0 0 0 / ${a(0.08)})`,
    "--shadow-xl": `0 24px 64px oklch(0 0 0 / ${a(0.24)}), 0 8px 16px oklch(0 0 0 / ${a(0.1)})`,
  };
}

function toBlock(selector: string, vars: Record<string, string>): string {
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return `${selector}{${body}}`;
}

export type ResolvedTheme = {
  css: string;
  /** flat map of the mode-independent vars, for client-side live preview */
  baseVars: Record<string, string>;
  lightVars: Record<string, string>;
  darkVars: Record<string, string>;
};

/**
 * Turn a ThemeConfig into a CSS string suitable for an inline <style> tag.
 * Emits: base vars on :root, light vars (default + [data-theme=light]),
 * dark vars ([data-theme=dark] and prefers-color-scheme fallback).
 */
export function resolveTheme(
  input: Partial<ThemeConfig> | undefined,
): ResolvedTheme {
  const cfg = themeConfigSchema.parse(input ?? {});

  const brand = generateScale(cfg.brandColor);
  const accent = generateScale(cfg.accentColor);

  const density = DENSITY_SCALE[cfg.density];
  const r = cfg.radius;

  const baseVars: Record<string, string> = {
    ...MOTION,
    ...STATUS,
    ...shadowSet(cfg.shadowIntensity),
    "--font-display": FONT_OPTIONS[cfg.fontDisplay],
    "--font-body": FONT_OPTIONS[cfg.fontBody],
    "--font-mono": FONT_OPTIONS.mono,
    "--radius-xs": `${Math.max(2, r - 8)}px`,
    "--radius-sm": `${Math.max(4, r - 4)}px`,
    "--radius-md": `${r}px`,
    "--radius-lg": `${r + 4}px`,
    "--radius-xl": `${r + 12}px`,
    "--radius-full": "9999px",
    "--space-unit": `${(0.25 * density).toFixed(4)}rem`,
    "--density": density.toString(),
    "--container-gutter": `${(1.25 * density).toFixed(3)}rem`,
    "--brand": brand[500],
    "--brand-fg": readableForeground(brand[500]),
    "--accent": accent[500],
    "--accent-fg": readableForeground(accent[500]),
  };
  for (const s of SHADES) {
    baseVars[`--brand-${s}`] = brand[s];
    baseVars[`--accent-${s}`] = accent[s];
  }

  const lightSemantic = semanticLayer(cfg, "light");
  const darkSemantic = semanticLayer(cfg, "dark");

  const lightVars: Record<string, string> = {
    ...lightSemantic,
    "--primary": brand[500],
    "--primary-hover": brand[600],
    "--primary-active": brand[700],
    "--primary-soft": brand[50],
    "--primary-ring": `${brand[500]}59`,
    "--accent-surface": accent[50],
    "--focus-ring": brand[500],
  };
  const darkVars: Record<string, string> = {
    ...darkSemantic,
    "--primary": brand[400],
    "--primary-hover": brand[300],
    "--primary-active": brand[200],
    "--primary-soft": `${brand[500]}26`,
    "--primary-ring": `${brand[400]}66`,
    "--accent-surface": `${accent[500]}26`,
    "--focus-ring": brand[400],
  };

  const css = [
    toBlock(":root", baseVars),
    toBlock(':root, :root[data-theme="light"]', lightVars),
    toBlock(':root[data-theme="dark"]', darkVars),
    `@media (prefers-color-scheme: dark){${toBlock(
      ':root:not([data-theme="light"])',
      darkVars,
    )}}`,
  ].join("\n");

  return { css, baseVars, lightVars, darkVars };
}
