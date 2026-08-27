import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-0)] px-3.5 text-sm text-[var(--text-primary)] shadow-xs transition-[box-shadow,border-color] duration-150 outline-none",
        "placeholder:text-[var(--text-ghost)]",
        "focus-visible:border-[var(--primary)] focus-visible:ring-4 focus-visible:ring-[var(--primary-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "aria-invalid:border-[var(--error)] aria-invalid:ring-[var(--error)]/25",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-0)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] shadow-xs transition-[box-shadow,border-color] duration-150 outline-none",
        "placeholder:text-[var(--text-ghost)]",
        "focus-visible:border-[var(--primary)] focus-visible:ring-4 focus-visible:ring-[var(--primary-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--error)]",
        className,
      )}
      {...props}
    />
  );
}
