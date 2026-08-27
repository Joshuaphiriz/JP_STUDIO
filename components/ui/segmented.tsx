"use client";

import * as React from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

type SegmentedProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
};

/** iOS-style segmented control. Single-select. */
export function Segmented({
  className,
  children,
  onValueChange,
  ...props
}: SegmentedProps) {
  return (
    <ToggleGroup.Root
      type="single"
      onValueChange={(v) => v && onValueChange?.(v)}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-2)] p-0.5",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroup.Root>
  );
}

export function SegmentedItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroup.Item>) {
  return (
    <ToggleGroup.Item
      className={cn(
        "press inline-flex h-8 items-center justify-center rounded-[calc(var(--radius-md)-2px)] px-3 text-[13px] font-medium text-[var(--text-secondary)] transition-colors outline-none",
        "hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)]",
        "data-[state=on]:bg-[var(--surface-0)] data-[state=on]:text-[var(--text-primary)] data-[state=on]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
