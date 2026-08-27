"use client";

import Link from "next/link";
import { LogOut, Palette, Settings } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  initials,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "./mode-toggle";
import type { SessionUser } from "@/lib/dal";

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="press flex w-full items-center gap-2.5 rounded-[var(--radius-md)] p-1.5 text-left outline-none hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)]">
        <Avatar className="size-8">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback>{initials(user.fullName, user.email)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">
            {user.fullName ?? user.email.split("@")[0]}
          </span>
          <span className="block truncate text-xs text-[var(--text-tertiary)]">
            {user.email}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-64">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <div className="px-2 pt-1 pb-2">
          <ModeToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings/appearance">
            <Palette /> Theme editor
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action="/auth/sign-out" method="post">
          <DropdownMenuItem asChild variant="danger">
            <button type="submit" className="w-full">
              <LogOut /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
