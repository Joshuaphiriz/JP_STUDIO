"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";

export function ModeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <Segmented
      value={mode}
      onValueChange={(v) => v && setMode(v as typeof mode)}
      aria-label="Color mode"
    >
      <SegmentedItem value="light" aria-label="Light">
        <Sun className="size-4" />
      </SegmentedItem>
      <SegmentedItem value="system" aria-label="System">
        <Monitor className="size-4" />
      </SegmentedItem>
      <SegmentedItem value="dark" aria-label="Dark">
        <Moon className="size-4" />
      </SegmentedItem>
    </Segmented>
  );
}
