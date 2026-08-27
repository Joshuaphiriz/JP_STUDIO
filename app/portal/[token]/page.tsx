import { notFound } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Logo } from "@/components/brand/logo";
import { db } from "@/lib/db/client";
import {
  mediaAssets,
  platformPosts,
  posts,
  socialAccounts,
} from "@/lib/db/schema";
import { publicMediaUrl } from "@/lib/publish/render";
import { resolvePortalToken } from "@/lib/portal/session";
import { PortalClient } from "./portal-client";

export const metadata = { title: "Review posts", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PortalPage(props: PageProps<"/portal/[token]">) {
  const { token } = await props.params;
  const session = await resolvePortalToken(token);
  if (!session) notFound();

  const pending = await db
    .select({
      id: posts.id,
      caption: posts.caption,
      mediaIds: posts.mediaIds,
      scheduledAt: posts.scheduledAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.workspaceId, session.workspaceId),
        eq(posts.status, "pending_client"),
      ),
    )
    .orderBy(desc(posts.updatedAt));

  const published = await db
    .select({
      id: posts.id,
      caption: posts.caption,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.workspaceId, session.workspaceId),
        eq(posts.status, "published"),
      ),
    )
    .orderBy(desc(posts.publishedAt))
    .limit(10);

  const targets = pending.length
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
            pending.map((p) => p.id),
          ),
        )
    : [];

  const mediaIds = [...new Set(pending.flatMap((p) => p.mediaIds))];
  const media = mediaIds.length
    ? await db
        .select()
        .from(mediaAssets)
        .where(inArray(mediaAssets.id, mediaIds))
    : [];
  const mediaUrl = new Map(
    media.map((m) => [
      m.id,
      { url: publicMediaUrl(m.storagePath), kind: m.kind as string },
    ]),
  );

  const items = pending.map((p) => ({
    id: p.id,
    caption: p.caption,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    targets: targets
      .filter((t) => t.postId === p.id)
      .map((t) => `${t.name} · ${t.platform}`),
    media: p.mediaIds.flatMap((id) => {
      const m = mediaUrl.get(id);
      return m ? [m] : [];
    }),
  }));

  return (
    <div className="min-h-dvh bg-[var(--surface-1)]">
      <header className="material sticky top-0 z-10 border-b border-[var(--border)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <Logo />
          <span className="text-sm text-[var(--text-tertiary)]">
            {session.workspaceName}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-xl font-semibold">Hi {session.label}</h1>
        <p className="mt-1 mb-6 text-sm text-[var(--text-tertiary)]">
          {items.length
            ? `${items.length} post${items.length > 1 ? "s" : ""} waiting for your approval.`
            : "Nothing needs your approval right now."}
        </p>
        <PortalClient token={token} items={items} />

        {published.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
              Recently published
            </h2>
            <ul className="flex flex-col gap-2">
              {published.map((p) => (
                <li
                  key={p.id}
                  className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-secondary)]"
                >
                  <span className="line-clamp-2">
                    {p.caption || "(no caption)"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
