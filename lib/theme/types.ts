import { z } from "zod";

export const FONT_OPTIONS = {
  geist: '"Geist", ui-sans-serif, system-ui, sans-serif',
  system:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", ui-sans-serif, system-ui, sans-serif',
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  serif: 'ui-serif, "New York", Georgia, Cambria, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace',
} as const;

export type FontKey = keyof typeof FONT_OPTIONS;

export const themeConfigSchema = z.object({
  /** light / dark / follow the OS */
  mode: z.enum(["light", "dark", "system"]).default("system"),
  /** primary brand color (hex) — drives the --brand-50..950 ramp */
  brandColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .default("#0A84FF"),
  /** secondary accent color (hex) */
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .default("#30D158"),
  /** neutral tint: hue in degrees (0 warm-red .. 250 cool-blue), chroma near-zero */
  grayHue: z.number().min(0).max(360).default(255),
  grayChroma: z.number().min(0).max(0.03).default(0.004),
  fontDisplay: z
    .enum(Object.keys(FONT_OPTIONS) as [FontKey, ...FontKey[]])
    .default("system"),
  fontBody: z
    .enum(Object.keys(FONT_OPTIONS) as [FontKey, ...FontKey[]])
    .default("system"),
  /** base corner radius in px (0 = square, 16 = very round) */
  radius: z.number().min(0).max(20).default(12),
  /** spacing scale */
  density: z.enum(["compact", "cozy", "comfortable"]).default("cozy"),
  /** 0 = flat, 1 = pronounced elevation */
  shadowIntensity: z.number().min(0).max(1).default(0.6),
});

export type ThemeConfig = z.infer<typeof themeConfigSchema>;

export const DENSITY_SCALE: Record<ThemeConfig["density"], number> = {
  compact: 0.85,
  cozy: 1,
  comfortable: 1.15,
};

/** Built-in default theme (schema defaults). Client-safe. */
export const DEFAULT_THEME: ThemeConfig = themeConfigSchema.parse({});
