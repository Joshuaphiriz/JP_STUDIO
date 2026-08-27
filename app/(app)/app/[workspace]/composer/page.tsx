import { and, desc, eq, inArray } from "drizzle-orm";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { ComposerClient } from "@/components/composer/composer-client";
import { db } from "@/lib/db/client";
import {
  mediaAssets,
  platformPosts,
  posts,
  socialAccounts,
} from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { publicMediaUrl } from "@/lib/publish/render";

export const metadata = { title: "Composer" };

export default async function ComposerPage(
  props: PageProps<"/app/[workspace]/composer">,
) {
  const { workspace } = await props.params;
  const sp = await props.searchParams;
  const ws = await requireWorkspace(workspace);

  const accounts = await db
    .select({
      id: socialAccounts.id,
      platform: socialAccounts.platform,
      displayName: socialAccounts.displayName,
      avatarUrl: socialAccounts.avatarUrl,
    })
    .from(socialAccounts)
    .where(
      and(
        eq(socialAccounts.workspaceId, ws.id),
        inArray(socialAccounts.status, ["connected", "token_expiring"]),
      ),
    )
    .orderBy(desc(socialAccounts.createdAt));

  let initialPost = null;
  let initialAssets: {
    id: string;
    url: string;
    kind: "image" | "video";
    fileName: string;
  }[] = [];

  const editId = typeof sp.post === "string" ? sp.post : null;
  if (editId) {
    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, editId), eq(posts.workspaceId, ws.id)))
      .limit(1);
    if (post) {
      const pps = await db
        .select()
        .from(platformPosts)
        .where(eq(platformPosts.postId, post.id));
      initialPost = {
        id: post.id,
        caption: post.caption,
        firstComment: post.firstComment,
        mediaIds: post.mediaIds,
        scheduledAt: post.scheduledAt ? toLocalInput(post.scheduledAt) : null,
        accountIds: pps.map((p) => p.socialAccountId),
        overrides: pps.map((p) => ({
          socialAccountId: p.socialAccountId,
          captionOverride: p.captionOverride,
        })),
      };
      if (post.mediaIds.length) {
        const media = await db
          .select()
          .from(mediaAssets)
          .where(inArray(mediaAssets.id, post.mediaIds));
        const byId = new Map(media.map((m) => [m.id, m]));
        initialAssets = post.mediaIds
          .map((id) => byId.get(id))
          .filter((m): m is (typeof media)[number] => Boolean(m))
          .map((m) => ({
            id: m.id,
            url: publicMediaUrl(m.storagePath),
            kind: m.kind as "image" | "video",
            fileName: m.fileName,
          }));
      }
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title={initialPost ? "Edit post" : "Composer"}
        description="Write once, tune per platform, preview live."
      />
      <ComposerClient
        workspaceSlug={ws.slug}
        accounts={accounts}
        initialPost={initialPost}
        initialAssets={initialAssets}
        canPublish={ws.can("post:publish")}
        approvalMode={(ws.approvalMode ?? "none") as string}
      />
    </PageContainer>
  );
}

/** UTC Date → value for <input type="datetime-local"> (local wall time). */
function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
