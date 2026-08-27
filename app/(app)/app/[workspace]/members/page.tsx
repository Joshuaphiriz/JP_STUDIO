import { and, eq, isNull } from "drizzle-orm";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { invitations, users, workspaceMembers } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { MembersClient } from "./members-client";

export const metadata = { title: "Members" };

export default async function MembersPage(
  props: PageProps<"/app/[workspace]/members">,
) {
  const { workspace } = await props.params;
  const ws = await requireWorkspace(workspace);
  const canManage = ws.can("member:manage");

  const members = await db
    .select({
      id: workspaceMembers.id,
      role: workspaceMembers.role,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, ws.id));

  const pending = canManage
    ? await db
        .select({
          id: invitations.id,
          email: invitations.email,
          role: invitations.workspaceRole,
          createdAt: invitations.createdAt,
        })
        .from(invitations)
        .where(
          and(
            eq(invitations.workspaceId, ws.id),
            isNull(invitations.acceptedAt),
          ),
        )
    : [];

  return (
    <PageContainer>
      <PageHeader
        title="Members"
        description="Who can work in this workspace."
      />
      <MembersClient
        workspaceSlug={ws.slug}
        currentUserId={ws.user.id}
        canManage={canManage}
        members={members}
        pending={pending.map((p) => ({
          ...p,
          role: p.role ?? "editor",
          createdAt: p.createdAt.toISOString(),
        }))}
      />
      {!canManage && (
        <Card className="mt-4 p-4 text-xs text-[var(--text-ghost)]">
          Only owners and managers can invite or change members.
        </Card>
      )}
    </PageContainer>
  );
}
