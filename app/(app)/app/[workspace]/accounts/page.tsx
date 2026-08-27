import { eq } from "drizzle-orm";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { db } from "@/lib/db/client";
import { socialAccounts } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { PLATFORM_CATALOG } from "@/lib/platforms/catalog";
import { isPlatformConfigured } from "@/lib/providers/registry";
import { AccountsClient } from "./accounts-client";

export const metadata = { title: "Accounts" };

export default async function AccountsPage(
  props: PageProps<"/app/[workspace]/accounts">,
) {
  const { workspace } = await props.params;
  const sp = await props.searchParams;
  const ws = await requireWorkspace(workspace);

  const connected = await db
    .select({
      id: socialAccounts.id,
      platform: socialAccounts.platform,
      displayName: socialAccounts.displayName,
      handle: socialAccounts.handle,
      avatarUrl: socialAccounts.avatarUrl,
      status: socialAccounts.status,
      followerCount: socialAccounts.followerCount,
    })
    .from(socialAccounts)
    .where(eq(socialAccounts.workspaceId, ws.id));

  const platforms = PLATFORM_CATALOG.map((p) => ({
    ...p,
    configured: isPlatformConfigured(p.key),
  }));

  const notice =
    typeof sp.connected === "string"
      ? { kind: "success" as const, text: `Connected ${sp.connected}` }
      : typeof sp.connect_error === "string"
        ? { kind: "error" as const, text: sp.connect_error }
        : typeof sp.error === "string"
          ? { kind: "error" as const, text: sp.error }
          : null;

  return (
    <PageContainer>
      <PageHeader
        title="Accounts"
        description="Connect the profiles this workspace publishes to."
      />
      <AccountsClient
        workspaceSlug={ws.slug}
        connected={connected}
        platforms={platforms}
        notice={notice}
      />
    </PageContainer>
  );
}
