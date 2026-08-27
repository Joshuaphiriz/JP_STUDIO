"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {hint && (
          <span className="text-xs text-[var(--text-ghost)]">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

const SWATCHES = [
  "#0A84FF",
  "#5E5CE6",
  "#7C3AED",
  "#EC4899",
  "#FF3B30",
  "#FF9F0A",
  "#34C759",
  "#059669",
  "#14B8A6",
  "#111113",
  "#8E8E93",
  "#B45309",
];

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <Field label={label} hint={value.toUpperCase()}>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={s}
            onClick={() => onChange(s)}
            className={cn(
              "size-7 rounded-full border transition-transform hover:scale-110",
              value.toLowerCase() === s.toLowerCase()
                ? "border-[var(--text-primary)] ring-2 ring-[var(--primary-ring)]"
                : "border-black/10",
            )}
            style={{ background: s }}
          />
        ))}
        <label className="relative size-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-[var(--border-strong)]">
          <span
            className="absolute inset-0"
            style={{
              background:
                "conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)",
            }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </Field>
  );
}
