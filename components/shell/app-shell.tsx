"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { SessionUser, WorkspaceSummary } from "@/lib/dal";
import { CommandPalette } from "./command-palette";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

function SidebarBody({
  workspaces,
  activeSlug,
  user,
  onNavigate,
}: {
  workspaces: WorkspaceSummary[];
  activeSlug?: string;
  user: SessionUser;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="px-1.5 pt-1">
        <Link href="/app" onClick={onNavigate} aria-label="JP Studio">
          <Logo />
        </Link>
      </div>
      <WorkspaceSwitcher workspaces={workspaces} activeSlug={activeSlug} />
      <div className="flex-1 overflow-y-auto">
        {activeSlug ? (
          <SidebarNav workspaceSlug={activeSlug} onNavigate={onNavigate} />
        ) : (
          <p className="px-2.5 py-2 text-[13px] text-[var(--text-tertiary)]">
            Pick a workspace to see its tools.
          </p>
        )}
      </div>
      <div className="border-t border-[var(--border)] pt-2">
        <UserMenu user={user} />
      </div>
    </div>
  );
}

const RESERVED = new Set(["new", "settings"]);

export function AppShell({
  workspaces,
  user,
  children,
}: {
  workspaces: WorkspaceSummary[];
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeSlug = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean); // ["app", "<slug>", ...]
    const slug = parts[1];
    if (!slug || RESERVED.has(slug)) return undefined;
    return workspaces.some((w) => w.slug === slug) ? slug : undefined;
  }, [pathname, workspaces]);

  return (
    <div className="flex min-h-dvh">
      <CommandPalette workspaces={workspaces} activeSlug={activeSlug} />

      {/* Desktop sidebar */}
      <aside className="material sticky top-0 hidden h-dvh w-[248px] shrink-0 border-r border-[var(--border)] lg:block">
        <SidebarBody
          workspaces={workspaces}
          activeSlug={activeSlug}
          user={user}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="material sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[var(--border)] px-3 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0" showClose={false}>
              <VisuallyHidden>
                <SheetTitle>Navigation</SheetTitle>
              </VisuallyHidden>
              <SidebarBody
                workspaces={workspaces}
                activeSlug={activeSlug}
                user={user}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <Link href="/app" aria-label="JP Studio">
            <Logo withWordmark={false} />
          </Link>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
