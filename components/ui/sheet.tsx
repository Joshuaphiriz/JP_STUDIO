"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

type Side = "top" | "bottom" | "left" | "right";

const sideClasses: Record<Side, string> = {
  right:
    "inset-y-0 right-0 h-full w-[min(26rem,calc(100%-2rem))] border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right rounded-l-[var(--radius-xl)]",
  left: "inset-y-0 left-0 h-full w-[min(26rem,calc(100%-2rem))] border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left rounded-r-[var(--radius-xl)]",
  bottom:
    "inset-x-0 bottom-0 max-h-[92dvh] border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom rounded-t-[var(--radius-2xl)]",
  top: "inset-x-0 top-0 max-h-[92dvh] border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top rounded-b-[var(--radius-2xl)]",
};

export function SheetContent({
  className,
  children,
  side = "right",
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: Side;
  showClose?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col gap-4 border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-xl",
          "duration-300 ease-[var(--ease-out)] data-[state=closed]:animate-out data-[state=open]:animate-in",
          "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {(side === "bottom" || side === "top") && (
          <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-[var(--border-strong)]" />
        )}
        {children}
        {showClose && (
          <DialogPrimitive.Close className="press absolute top-4 right-4 rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-2)]">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-base font-semibold text-[var(--text-primary)]",
        className,
      )}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-[var(--text-tertiary)]", className)}
      {...props}
    />
  );
}
