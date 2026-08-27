import Link from "next/link";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { format, isSameDay } from "date-fns";
import { CalendarClock, Plus } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { platformPosts, posts, socialAccounts } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";

export const metadata = { title: "Calendar" };

const STATUS_VARIANT: Record<
  string,
  "neutral" | "primary" | "success" | "warning" | "error"
> = {
  draft: "neutral",
  scheduled: "primary",
  publishing: "warning",
  published: "success",
  partially_failed: "warning",
  failed: "error",
};

export default async function CalendarPage(
  props: PageProps<"/app/[workspace]/calendar">,
) {
  const { workspace } = await props.params;
  const ws = await requireWorkspace(workspace);
  const base = `/app/${ws.slug}`;

  const rows = await db
    .select({
      id: posts.id,
      status: posts.status,
      caption: posts.caption,
      scheduledAt: posts.scheduledAt,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.workspaceId, ws.id),
        eq(posts.isTemplate, false),
        isNotNull(posts.scheduledAt),
      ),
    )
    .orderBy(asc(posts.scheduledAt))
    .limit(200);

  const accountsByPost = await db
    .select({
      postId: platformPosts.postId,
      platform: platformPosts.platform,
      name: socialAccounts.displayName,
      ppStatus: platformPosts.status,
      lastError: platformPosts.lastError,
    })
    .from(platformPosts)
    .innerJoin(
      socialAccounts,
      eq(socialAccounts.id, platformPosts.socialAccountId),
    )
    .where(
      rows.length
        ? inArray(
            platformPosts.postId,
            rows.map((r) => r.id),
          )
        : eq(platformPosts.postId, "00000000-0000-0000-0000-000000000000"),
    );

  const byDay = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = format(r.scheduledAt!, "yyyy-MM-dd");
    const list = byDay.get(key) ?? [];
    list.push(r);
    byDay.set(key, list);
  }

  const drafts = await db
    .select({
      id: posts.id,
      caption: posts.caption,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.workspaceId, ws.id),
        eq(posts.status, "draft"),
        eq(posts.isTemplate, false),
      ),
    )
    .orderBy(desc(posts.updatedAt))
    .limit(20);

  return (
    <PageContainer>
      <PageHeader
        title="Calendar"
        description="Everything scheduled, in order."
        actions={
          <Button asChild size="sm">
            <Link href={`${base}/composer`}>
              <Plus /> New post
            </Link>
          </Button>
        }
      />

      {rows.length === 0 && drafts.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <CalendarClock className="size-8 text-[var(--text-tertiary)]" />
          <p className="text-sm text-[var(--text-tertiary)]">
            Nothing scheduled yet.
          </p>
          <Button asChild size="sm">
            <Link href={`${base}/composer`}>Compose a post</Link>
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {drafts.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                Drafts
              </h2>
              <div className="flex flex-col gap-2">
                {drafts.map((d) => (
                  <Link
                    key={d.id}
                    href={`${base}/composer?post=${d.id}`}
                    className="press flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-0)] p-3 hover:border-[var(--border-strong)]"
                  >
                    <Badge variant="neutral">draft</Badge>
                    <span className="truncate text-sm text-[var(--text-secondary)]">
                      {d.caption || "Untitled"}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {[...byDay.entries()].map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                {format(new Date(day), "EEEE, MMM d")}
                {isSameDay(new Date(day), new Date()) && (
                  <span className="ml-2 text-[var(--primary)]">Today</span>
                )}
              </h2>
              <div className="flex flex-col gap-2">
                {items.map((p) => {
                  const targets = accountsByPost.filter(
                    (a) => a.postId === p.id,
                  );
                  return (
                    <Link
                      key={p.id}
                      href={`${base}/composer?post=${p.id}`}
                      className="press flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-0)] p-3 hover:border-[var(--border-strong)]"
                    >
                      <span className="mt-0.5 text-xs text-[var(--text-tertiary)] tabular-nums">
                        {format(p.scheduledAt!, "HH:mm")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm text-[var(--text-primary)]">
                          {p.caption || "(no caption)"}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          {targets.map((t, i) => (
                            <span
                              key={i}
                              className="text-[11px] text-[var(--text-tertiary)]"
                            >
                              {t.name} · {t.platform}
                            </span>
                          ))}
                        </span>
                      </span>
                      <Badge variant={STATUS_VARIANT[p.status] ?? "neutral"}>
                        {p.status.replace("_", " ")}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
