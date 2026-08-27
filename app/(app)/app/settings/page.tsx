import Link from "next/link";
import { ChevronRight, Palette, User } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Settings" };

const SECTIONS = [
  {
    href: "/app/settings/appearance",
    icon: Palette,
    title: "Appearance",
    desc: "Theme, colors, typography, density, and light/dark mode.",
  },
  {
    href: "/app/settings/account",
    icon: User,
    title: "Account",
    desc: "Your profile and notification preferences.",
    soon: true,
  },
];

export default function SettingsIndex() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <div className="mt-6 grid gap-3">
        {SECTIONS.map((s) => (
          <Card key={s.href} className="p-0">
            <Link
              href={s.soon ? "#" : s.href}
              aria-disabled={s.soon}
              className={
                "press flex items-center gap-4 p-4 " +
                (s.soon
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-[var(--surface-1)]")
              }
            >
              <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-2)]">
                <s.icon className="size-5 text-[var(--text-secondary)]" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">{s.title}</span>
                <span className="block text-xs text-[var(--text-tertiary)]">
                  {s.desc}
                </span>
              </span>
              <ChevronRight className="size-4 text-[var(--text-ghost)]" />
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}
