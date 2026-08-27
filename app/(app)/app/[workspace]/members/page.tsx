import { eq } from "drizzle-orm";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  initials,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { users, workspaceMembers } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";

export const metadata = { title: "Members" };

export default async function MembersPage(
  props: PageProps<"/app/[workspace]/members">,
) {
  const { workspace } = await props.params;
  const ws = await requireWorkspace(workspace);

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

  return (
    <PageContainer>
      <PageHeader
        title="Members"
        description="Who can work in this workspace."
      />
      <Card>
        <ul>
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 border-b border-[var(--border)] p-4 last:border-0"
            >
              <Avatar className="size-9">
                {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
                <AvatarFallback>{initials(m.fullName, m.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.fullName ?? m.email.split("@")[0]}
                  {m.userId === ws.user.id && (
                    <span className="ml-1.5 text-xs text-[var(--text-ghost)]">
                      you
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-[var(--text-tertiary)]">
                  {m.email}
                </p>
              </div>
              <Badge variant={m.role === "owner" ? "primary" : "neutral"}>
                {m.role}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-4 text-xs text-[var(--text-ghost)]">
        Invitations and role management arrive in Phase 2.
      </p>
    </PageContainer>
  );
}
