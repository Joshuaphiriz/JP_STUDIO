"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceSummary } from "@/lib/dal";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({
  workspaces,
  activeSlug,
}: {
  workspaces: WorkspaceSummary[];
  activeSlug?: string;
}) {
  const router = useRouter();
  const active = workspaces.find((w) => w.slug === activeSlug);

  const grouped = workspaces.reduce<Record<string, WorkspaceSummary[]>>(
    (acc, w) => {
      (acc[w.organizationName] ??= []).push(w);
      return acc;
    },
    {},
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="press flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-0)] px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)]">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[11px] font-semibold text-[var(--brand-fg)]">
          {(active?.name ?? "JP").slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">
            {active?.name ?? "Select workspace"}
          </span>
          {active && (
            <span className="block truncate text-[11px] text-[var(--text-tertiary)]">
              {active.organizationName}
            </span>
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-[var(--text-tertiary)]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[15rem]">
        {Object.entries(grouped).map(([org, list]) => (
          <div key={org}>
            <DropdownMenuLabel>{org}</DropdownMenuLabel>
            {list.map((w) => (
              <DropdownMenuItem
                key={w.id}
                onSelect={() => router.push(`/app/${w.slug}`)}
              >
                <span className="flex size-5 items-center justify-center rounded-[var(--radius-xs)] bg-[var(--surface-3)] text-[10px] font-semibold">
                  {w.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="truncate">{w.name}</span>
                <Check
                  className={cn(
                    "ml-auto size-4",
                    w.slug === activeSlug ? "opacity-100" : "opacity-0",
                  )}
                />
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/app/new")}>
          <Plus /> New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
