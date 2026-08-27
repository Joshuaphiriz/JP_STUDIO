import { and, asc, eq, isNull } from "drizzle-orm";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { posts, queues, timeSlots } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { QueueClient } from "./queue-client";

export const metadata = { title: "Queues" };

export default async function QueuePage(
  props: PageProps<"/app/[workspace]/queue">,
) {
  const { workspace } = await props.params;
  const ws = await requireWorkspace(workspace);

  const qs = await db
    .select()
    .from(queues)
    .where(eq(queues.workspaceId, ws.id))
    .orderBy(asc(queues.name));

  const slots = await db
    .select()
    .from(timeSlots)
    .where(eq(timeSlots.workspaceId, ws.id));

  const queuedPosts = await db
    .select({
      id: posts.id,
      caption: posts.caption,
      queueId: posts.queueId,
      scheduledAt: posts.scheduledAt,
      status: posts.status,
    })
    .from(posts)
    .where(and(eq(posts.workspaceId, ws.id), eq(posts.isTemplate, false)))
    .orderBy(asc(posts.scheduledAt));

  const unassignedDrafts = await db
    .select({ id: posts.id, caption: posts.caption })
    .from(posts)
    .where(
      and(
        eq(posts.workspaceId, ws.id),
        eq(posts.isTemplate, false),
        isNull(posts.queueId),
        eq(posts.status, "draft"),
      ),
    )
    .orderBy(asc(posts.createdAt))
    .limit(30);

  return (
    <PageContainer>
      <PageHeader
        title="Queues"
        description="Named posting schedules — drop a draft in and it lands on the next open slot."
      />
      <QueueClient
        workspaceSlug={ws.slug}
        canManage={ws.can("queue:manage")}
        queues={qs.map((q) => ({ id: q.id, name: q.name }))}
        slots={slots.map((s) => ({
          id: s.id,
          queueId: s.queueId,
          weekday: s.weekday,
          minuteOfDay: s.minuteOfDay,
        }))}
        posts={queuedPosts
          .filter((p) => p.queueId)
          .map((p) => ({
            id: p.id,
            caption: p.caption,
            queueId: p.queueId!,
            scheduledAt: p.scheduledAt?.toISOString() ?? null,
            status: p.status,
          }))}
        drafts={unassignedDrafts}
      />
    </PageContainer>
  );
}
