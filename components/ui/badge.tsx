import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--surface-2)] text-[var(--text-secondary)]",
        primary: "bg-[var(--primary-soft)] text-[var(--primary-active)]",
        success: "bg-[var(--success)]/12 text-[var(--success)]",
        warning: "bg-[var(--warning)]/14 text-[var(--warning)]",
        error: "bg-[var(--error)]/12 text-[var(--error)]",
        outline:
          "border border-[var(--border-strong)] text-[var(--text-secondary)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ variant }), className)} {...props} />;
}
