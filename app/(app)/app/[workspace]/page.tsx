import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  PenSquare,
  Plug,
  Users,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { socialAccounts, workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireWorkspace } from "@/lib/dal";

export async function generateMetadata(props: PageProps<"/app/[workspace]">) {
  const { workspace } = await props.params;
  const ws = await requireWorkspace(workspace);
  return { title: ws.name };
}

export default async function WorkspaceOverview(
  props: PageProps<"/app/[workspace]">,
) {
  const { workspace } = await props.params;
  const ws = await requireWorkspace(workspace);
  const base = `/app/${ws.slug}`;

  const [accounts, members] = await Promise.all([
    db
      .select({ id: socialAccounts.id })
      .from(socialAccounts)
      .where(eq(socialAccounts.workspaceId, ws.id)),
    db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, ws.id)),
  ]);

  const steps = [
    {
      done: accounts.length > 0,
      title: "Connect a social account",
      href: `${base}/accounts`,
      icon: Plug,
    },
    {
      done: members.length > 1,
      title: "Invite your team or client",
      href: `${base}/members`,
      icon: Users,
    },
    {
      done: false,
      title: "Compose your first post",
      href: `${base}/composer`,
      icon: PenSquare,
    },
    {
      done: false,
      title: "Set a posting schedule",
      href: `${base}/queue`,
      icon: CalendarClock,
    },
  ];
  const completed = steps.filter((s) => s.done).length;

  return (
    <PageContainer>
      <PageHeader
        title={ws.name}
        description="Your workspace at a glance."
        actions={<Badge variant="outline">{ws.role}</Badge>}
      />

      <Reveal>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
            <div>
              <h2 className="font-semibold">Get started</h2>
              <p className="text-sm text-[var(--text-tertiary)]">
                {completed} of {steps.length} done
              </p>
            </div>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-all"
                style={{ width: `${(completed / steps.length) * 100}%` }}
              />
            </div>
          </div>
          <ul>
            {steps.map((s) => (
              <li key={s.title}>
                <Link
                  href={s.href}
                  className="press flex items-center gap-3 border-b border-[var(--border)] p-4 last:border-0 hover:bg-[var(--surface-1)]"
                >
                  {s.done ? (
                    <CheckCircle2 className="size-5 text-[var(--success)]" />
                  ) : (
                    <Circle className="size-5 text-[var(--text-ghost)]" />
                  )}
                  <span
                    className={
                      s.done
                        ? "text-[var(--text-tertiary)] line-through"
                        : "text-[var(--text-primary)]"
                    }
                  >
                    {s.title}
                  </span>
                  <s.icon className="ml-auto size-4 text-[var(--text-ghost)]" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </Reveal>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Connected accounts", value: accounts.length },
          { label: "Team members", value: members.length },
          { label: "Scheduled posts", value: 0 },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="text-sm text-[var(--text-tertiary)]">{stat.label}</p>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
