"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WORKSPACE_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export function SidebarNav({
  workspaceSlug,
  onNavigate,
}: {
  workspaceSlug: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/app/${workspaceSlug}`;

  return (
    <nav className="flex flex-col gap-0.5">
      {WORKSPACE_NAV.map((item) => {
        const href = item.segment ? `${base}/${item.segment}` : base;
        const active =
          item.segment === ""
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={item.label}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "press group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)]",
              active
                ? "bg-[var(--primary-soft)] text-[var(--primary-active)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon
              name={item.icon}
              className={cn(
                "size-4 shrink-0",
                active
                  ? "text-[var(--primary)]"
                  : "text-[var(--text-tertiary)]",
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {item.ready === false && (
              <span className="rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
                soon
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
