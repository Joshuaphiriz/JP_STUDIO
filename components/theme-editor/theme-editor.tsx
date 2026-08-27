"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_THEME,
  FONT_OPTIONS,
  type FontKey,
  type ThemeConfig,
} from "@/lib/theme/types";
import { THEME_PRESETS } from "@/lib/theme/presets";
import {
  resetPersonalTheme,
  savePersonalTheme,
} from "@/app/(app)/app/settings/appearance/actions";
import { ColorField, Field } from "./controls";
import { ThemePreview } from "./preview";

const FONT_LABELS: Record<FontKey, string> = {
  system: "System (SF / Segoe)",
  geist: "Geist",
  inter: "Inter",
  serif: "Serif",
  mono: "Mono",
};

export function ThemeEditor({ initial }: { initial: ThemeConfig }) {
  const { config, preview, setMode, mode } = useTheme();
  const [pending, start] = useTransition();
  const [savedConfig, setSavedConfig] = useState<ThemeConfig>(initial);

  const dirty = JSON.stringify(config) !== JSON.stringify(savedConfig);

  const set = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) =>
    preview({ [key]: value } as Partial<ThemeConfig>);

  const save = () =>
    start(async () => {
      const res = await savePersonalTheme(config);
      if (res.ok) {
        setSavedConfig(config);
        toast.success("Theme saved");
      } else {
        toast.error(res.error ?? "Could not save");
      }
    });

  const reset = () =>
    start(async () => {
      await resetPersonalTheme();
      preview(DEFAULT_THEME);
      setSavedConfig(DEFAULT_THEME);
      toast.success("Reset to default");
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-5">
        <Card>
          <CardContent className="flex flex-col gap-5 p-5">
            <Field label="Start from a preset">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {THEME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      preview({ ...DEFAULT_THEME, ...p.config, mode })
                    }
                    className="press flex flex-col items-start gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-0)] p-3 text-left hover:border-[var(--border-strong)]"
                  >
                    <span className="flex gap-1">
                      <span
                        className="size-4 rounded-full"
                        style={{ background: p.config.brandColor }}
                      />
                      <span
                        className="size-4 rounded-full"
                        style={{ background: p.config.accentColor }}
                      />
                    </span>
                    <span className="text-[13px] font-medium">{p.name}</span>
                  </button>
                ))}
              </div>
            </Field>

            <ColorField
              label="Brand color"
              value={config.brandColor}
              onChange={(v) => set("brandColor", v)}
            />
            <ColorField
              label="Accent color"
              value={config.accentColor}
              onChange={(v) => set("accentColor", v)}
            />

            <Field label="Neutral tint" hint={`${Math.round(config.grayHue)}°`}>
              <Slider
                min={0}
                max={320}
                step={5}
                value={[config.grayHue]}
                onValueChange={([v]) => set("grayHue", v)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display font">
                <FontSelect
                  value={config.fontDisplay}
                  onChange={(v) => set("fontDisplay", v)}
                />
              </Field>
              <Field label="Body font">
                <FontSelect
                  value={config.fontBody}
                  onChange={(v) => set("fontBody", v)}
                />
              </Field>
            </div>

            <Field label="Corner radius" hint={`${config.radius}px`}>
              <Slider
                min={0}
                max={20}
                step={1}
                value={[config.radius]}
                onValueChange={([v]) => set("radius", v)}
              />
            </Field>

            <Field label="Density">
              <Segmented
                value={config.density}
                onValueChange={(v) =>
                  v && set("density", v as ThemeConfig["density"])
                }
              >
                <SegmentedItem value="compact">Compact</SegmentedItem>
                <SegmentedItem value="cozy">Cozy</SegmentedItem>
                <SegmentedItem value="comfortable">Comfortable</SegmentedItem>
              </Segmented>
            </Field>

            <Field
              label="Elevation"
              hint={`${Math.round(config.shadowIntensity * 100)}%`}
            >
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[config.shadowIntensity]}
                onValueChange={([v]) => set("shadowIntensity", v)}
              />
            </Field>

            <Field label="Color mode">
              <Segmented
                value={mode}
                onValueChange={(v) => v && setMode(v as ThemeConfig["mode"])}
              >
                <SegmentedItem value="light">Light</SegmentedItem>
                <SegmentedItem value="system">System</SegmentedItem>
                <SegmentedItem value="dark">Dark</SegmentedItem>
              </Segmented>
            </Field>
          </CardContent>
        </Card>

        <div className="sticky bottom-4 flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-0)]/90 p-3 shadow-lg backdrop-blur">
          <Button onClick={save} disabled={pending || !dirty}>
            <Check className="size-4" />
            {dirty ? "Save changes" : "Saved"}
          </Button>
          <Button variant="ghost" onClick={reset} disabled={pending}>
            <RotateCcw className="size-4" /> Reset to default
          </Button>
          <p className="ml-auto hidden text-xs text-[var(--text-ghost)] sm:block">
            Applies to your account on every device.
          </p>
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:h-fit">
        <p className="mb-2 text-xs font-medium tracking-wide text-[var(--text-ghost)] uppercase">
          Live preview
        </p>
        <ThemePreview />
      </div>
    </div>
  );
}

function FontSelect({
  value,
  onChange,
}: {
  value: FontKey;
  onChange: (v: FontKey) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FontKey)}
      className="h-10 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-0)] px-3 text-sm outline-none focus-visible:border-[var(--primary)] focus-visible:ring-4 focus-visible:ring-[var(--primary-ring)]"
    >
      {(Object.keys(FONT_OPTIONS) as FontKey[]).map((k) => (
        <option key={k} value={k}>
          {FONT_LABELS[k]}
        </option>
      ))}
    </select>
  );
}
