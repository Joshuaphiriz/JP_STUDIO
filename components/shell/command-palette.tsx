"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { WORKSPACE_NAV } from "@/lib/nav";
import type { WorkspaceSummary } from "@/lib/dal";
import { Icon } from "./icon";

export function CommandPalette({
  workspaces,
  activeSlug,
}: {
  workspaces: WorkspaceSummary[];
  activeSlug?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command menu"
      contentClassName="fixed top-[18vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-0)] shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
      overlayClassName="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0"
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3.5">
        <Search className="size-4 text-[var(--text-tertiary)]" />
        <Command.Input
          placeholder="Jump to…"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-ghost)]"
        />
      </div>
      <Command.List className="max-h-[320px] overflow-y-auto p-1.5">
        <Command.Empty className="px-3 py-6 text-center text-sm text-[var(--text-tertiary)]">
          Nothing found.
        </Command.Empty>

        {activeSlug && (
          <Command.Group
            heading="This workspace"
            className="px-1.5 py-1 text-[11px] font-medium tracking-wide text-[var(--text-ghost)] uppercase [&_[cmdk-group-items]]:mt-1"
          >
            {WORKSPACE_NAV.map((item) => (
              <Command.Item
                key={item.label}
                value={`${item.label} ${activeSlug}`}
                onSelect={() =>
                  go(
                    item.segment
                      ? `/app/${activeSlug}/${item.segment}`
                      : `/app/${activeSlug}`,
                  )
                }
                className="flex cursor-default items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-[var(--text-primary)] data-[selected=true]:bg-[var(--surface-2)]"
              >
                <Icon
                  name={item.icon}
                  className="size-4 text-[var(--text-tertiary)]"
                />
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group
          heading="Workspaces"
          className="px-1.5 py-1 text-[11px] font-medium tracking-wide text-[var(--text-ghost)] uppercase [&_[cmdk-group-items]]:mt-1"
        >
          {workspaces.map((w) => (
            <Command.Item
              key={w.id}
              value={`${w.name} ${w.organizationName}`}
              onSelect={() => go(`/app/${w.slug}`)}
              className="flex cursor-default items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-[var(--text-primary)] data-[selected=true]:bg-[var(--surface-2)]"
            >
              <span className="flex size-5 items-center justify-center rounded-[var(--radius-xs)] bg-[var(--surface-3)] text-[10px] font-semibold">
                {w.name.slice(0, 2).toUpperCase()}
              </span>
              {w.name}
              <span className="ml-auto text-xs text-[var(--text-ghost)]">
                {w.organizationName}
              </span>
            </Command.Item>
          ))}
          <Command.Item
            value="new workspace create"
            onSelect={() => go("/app/new")}
            className="flex cursor-default items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-[var(--text-primary)] data-[selected=true]:bg-[var(--surface-2)]"
          >
            <Icon name="Plus" className="size-4 text-[var(--text-tertiary)]" />
            New workspace
          </Command.Item>
        </Command.Group>

        <Command.Group
          heading="Settings"
          className="px-1.5 py-1 text-[11px] font-medium tracking-wide text-[var(--text-ghost)] uppercase [&_[cmdk-group-items]]:mt-1"
        >
          <Command.Item
            value="theme editor appearance"
            onSelect={() => go("/app/settings/appearance")}
            className="flex cursor-default items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm text-[var(--text-primary)] data-[selected=true]:bg-[var(--surface-2)]"
          >
            <Icon
              name="Palette"
              className="size-4 text-[var(--text-tertiary)]"
            />
            Theme editor
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
