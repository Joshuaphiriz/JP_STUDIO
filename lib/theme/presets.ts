import type { ThemeConfig } from "./types";

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  config: Partial<ThemeConfig>;
};

/** Starting points for the theme editor. `config` is merged over schema defaults. */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "studio",
    name: "Studio",
    description: "The default — calm blue, soft depth, cool grays.",
    config: {
      brandColor: "#0A84FF",
      accentColor: "#30D158",
      grayHue: 255,
      radius: 12,
      density: "cozy",
      shadowIntensity: 0.6,
      fontDisplay: "system",
      fontBody: "system",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Monochrome and understated. Ink on paper.",
    config: {
      brandColor: "#3A3A3C",
      accentColor: "#0A84FF",
      grayHue: 265,
      grayChroma: 0.002,
      radius: 8,
      density: "cozy",
      shadowIntensity: 0.35,
    },
  },
  {
    id: "vibrant",
    name: "Vibrant",
    description: "Punchy violet, rounded, generous spacing.",
    config: {
      brandColor: "#7C3AED",
      accentColor: "#EC4899",
      grayHue: 285,
      radius: 16,
      density: "comfortable",
      shadowIntensity: 0.8,
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Serif display type, warm paper grays, restrained.",
    config: {
      brandColor: "#B45309",
      accentColor: "#1D4ED8",
      grayHue: 60,
      grayChroma: 0.006,
      radius: 6,
      density: "cozy",
      shadowIntensity: 0.3,
      fontDisplay: "serif",
      fontBody: "system",
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep green, earthy neutrals, medium radius.",
    config: {
      brandColor: "#059669",
      accentColor: "#D97706",
      grayHue: 150,
      grayChroma: 0.004,
      radius: 10,
      density: "cozy",
      shadowIntensity: 0.55,
    },
  },
  {
    id: "mono-round",
    name: "Mono Round",
    description: "Black brand, pill everything, airy.",
    config: {
      brandColor: "#111113",
      accentColor: "#0A84FF",
      grayHue: 250,
      radius: 18,
      density: "comfortable",
      shadowIntensity: 0.4,
    },
  },
];
