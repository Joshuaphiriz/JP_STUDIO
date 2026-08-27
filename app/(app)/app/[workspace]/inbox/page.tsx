import { and, desc, eq, inArray } from "drizzle-orm";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import {
  inboxMessages,
  inboxNotes,
  inboxReplies,
  savedReplies,
  socialAccounts,
  users,
  workspaceMembers,
} from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { InboxClient } from "./inbox-client";

export const metadata = { title: "Inbox" };

export default async function InboxPage(
  props: PageProps<"/app/[workspace]/inbox">,
) {
  const { workspace } = await props.params;
  const sp = await props.searchParams;
  const ws = await requireWorkspace(workspace);
  if (!ws.can("inbox:view")) {
    return (
      <PageContainer>
        <PageHeader
          title="Inbox"
          description="You don't have inbox access here."
        />
      </PageContainer>
    );
  }

  const statusFilter = typeof sp.status === "string" ? sp.status : "open";
  const wanted =
    statusFilter === "all"
      ? (["unread", "open", "resolved", "archived"] as const)
      : statusFilter === "resolved"
        ? (["resolved"] as const)
        : (["unread", "open"] as const);

  const messages = await db
    .select({
      id: inboxMessages.id,
      type: inboxMessages.type,
      platform: inboxMessages.platform,
      body: inboxMessages.body,
      authorName: inboxMessages.authorName,
      authorHandle: inboxMessages.authorHandle,
      permalink: inboxMessages.permalink,
      status: inboxMessages.status,
      sentiment: inboxMessages.sentiment,
      assigneeUserId: inboxMessages.assigneeUserId,
      platformCreatedAt: inboxMessages.platformCreatedAt,
      accountName: socialAccounts.displayName,
    })
    .from(inboxMessages)
    .innerJoin(
      socialAccounts,
      eq(socialAccounts.id, inboxMessages.socialAccountId),
    )
    .where(
      and(
        eq(inboxMessages.workspaceId, ws.id),
        inArray(inboxMessages.status, [...wanted]),
      ),
    )
    .orderBy(desc(inboxMessages.platformCreatedAt))
    .limit(100);

  const selectedId =
    typeof sp.m === "string" && messages.some((x) => x.id === sp.m)
      ? sp.m
      : (messages[0]?.id ?? null);

  const [members, replies, notesList, saved] = await Promise.all([
    db
      .select({
        userId: workspaceMembers.userId,
        name: users.fullName,
        email: users.email,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, ws.id)),
    selectedId
      ? db
          .select()
          .from(inboxReplies)
          .where(eq(inboxReplies.messageId, selectedId))
          .orderBy(inboxReplies.createdAt)
      : Promise.resolve([]),
    selectedId
      ? db
          .select({
            id: inboxNotes.id,
            body: inboxNotes.body,
            createdAt: inboxNotes.createdAt,
            authorName: users.fullName,
          })
          .from(inboxNotes)
          .leftJoin(users, eq(users.id, inboxNotes.authorUserId))
          .where(eq(inboxNotes.messageId, selectedId))
          .orderBy(inboxNotes.createdAt)
      : Promise.resolve([]),
    db
      .select()
      .from(savedReplies)
      .where(eq(savedReplies.workspaceId, ws.id))
      .orderBy(savedReplies.title),
  ]);

  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title="Inbox"
        description="Comments, mentions, and messages from every account."
      />
      {messages.length === 0 ? (
        <Card className="p-12 text-center text-sm text-[var(--text-tertiary)]">
          Nothing here yet. Connected accounts sync every few minutes.
        </Card>
      ) : (
        <InboxClient
          workspaceSlug={ws.slug}
          currentUserId={ws.user.id}
          canReply={ws.can("inbox:reply")}
          statusFilter={statusFilter}
          messages={messages.map((m) => ({
            ...m,
            platformCreatedAt: m.platformCreatedAt.toISOString(),
          }))}
          selectedId={selectedId}
          members={members}
          replies={replies.map((r) => ({
            id: r.id,
            body: r.body,
            createdAt: r.createdAt.toISOString(),
          }))}
          notes={notesList.map((n) => ({
            id: n.id,
            body: n.body,
            authorName: n.authorName,
            createdAt: n.createdAt.toISOString(),
          }))}
          savedReplies={saved.map((s) => ({
            id: s.id,
            title: s.title,
            body: s.body,
          }))}
        />
      )}
    </PageContainer>
  );
}
