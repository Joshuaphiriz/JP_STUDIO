import { and, desc, eq, isNull } from "drizzle-orm";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { clientPortalTokens } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { getAppUrl } from "@/lib/url";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Workspace settings" };

export default async function WorkspaceSettingsPage(
  props: PageProps<"/app/[workspace]/settings">,
) {
  const { workspace } = await props.params;
  const ws = await requireWorkspace(workspace);
  const canManage = ws.can("settings:manage");

  const links = canManage
    ? await db
        .select({
          id: clientPortalTokens.id,
          label: clientPortalTokens.label,
          createdAt: clientPortalTokens.createdAt,
          expiresAt: clientPortalTokens.expiresAt,
          lastUsedAt: clientPortalTokens.lastUsedAt,
        })
        .from(clientPortalTokens)
        .where(
          and(
            eq(clientPortalTokens.workspaceId, ws.id),
            isNull(clientPortalTokens.revokedAt),
          ),
        )
        .orderBy(desc(clientPortalTokens.createdAt))
    : [];

  return (
    <PageContainer>
      <PageHeader title="Workspace settings" description={ws.name} />
      {canManage ? (
        <SettingsClient
          workspaceSlug={ws.slug}
          approvalMode={(ws.approvalMode ?? "none") as string}
          appUrl={await getAppUrl()}
          portalLinks={links.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
            expiresAt: l.expiresAt.toISOString(),
            lastUsedAt: l.lastUsedAt?.toISOString() ?? null,
          }))}
        />
      ) : (
        <Card className="p-8 text-center text-sm text-[var(--text-tertiary)]">
          Only owners and managers can change workspace settings.
        </Card>
      )}
    </PageContainer>
  );
}
