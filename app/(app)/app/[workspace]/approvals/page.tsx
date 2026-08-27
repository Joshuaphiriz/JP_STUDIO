import { and, desc, eq, inArray } from "drizzle-orm";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { platformPosts, posts, socialAccounts, users } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { ApprovalsClient } from "./approvals-client";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage(
  props: PageProps<"/app/[workspace]/approvals">,
) {
  const { workspace } = await props.params;
  const ws = await requireWorkspace(workspace);
  const canInternal = ws.can("approval:internal");
  const canClient = ws.can("approval:client");

  const wanted: ("pending_review" | "pending_client" | "changes_requested")[] =
    [];
  if (canInternal) wanted.push("pending_review", "changes_requested");
  if (canClient) wanted.push("pending_client");

  const rows = wanted.length
    ? await db
        .select({
          id: posts.id,
          status: posts.status,
          caption: posts.caption,
          mediaIds: posts.mediaIds,
          scheduledAt: posts.scheduledAt,
          updatedAt: posts.updatedAt,
          authorName: users.fullName,
          authorEmail: users.email,
        })
        .from(posts)
        .leftJoin(users, eq(users.id, posts.authorUserId))
        .where(and(eq(posts.workspaceId, ws.id), inArray(posts.status, wanted)))
        .orderBy(desc(posts.updatedAt))
    : [];

  const targets = rows.length
    ? await db
        .select({
          postId: platformPosts.postId,
          platform: platformPosts.platform,
          name: socialAccounts.displayName,
        })
        .from(platformPosts)
        .innerJoin(
          socialAccounts,
          eq(socialAccounts.id, platformPosts.socialAccountId),
        )
        .where(
          inArray(
            platformPosts.postId,
            rows.map((r) => r.id),
          ),
        )
    : [];

  const items = rows.map((r) => ({
    ...r,
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
    stage: (r.status === "pending_client" ? "client" : "internal") as
      "internal" | "client",
    targets: targets
      .filter((t) => t.postId === r.id)
      .map((t) => `${t.name} · ${t.platform}`),
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Approvals"
        description={
          canInternal || canClient
            ? "Posts waiting on a decision."
            : "You don't review posts in this workspace."
        }
      />
      {items.length === 0 ? (
        <Card className="p-12 text-center text-sm text-[var(--text-tertiary)]">
          Nothing waiting for review.
        </Card>
      ) : (
        <ApprovalsClient workspaceSlug={ws.slug} items={items} />
      )}
    </PageContainer>
  );
}
