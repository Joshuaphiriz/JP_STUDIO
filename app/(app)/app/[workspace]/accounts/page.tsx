import { eq } from "drizzle-orm";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { socialAccounts } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { PLATFORM_CATALOG } from "@/lib/platforms/catalog";

export const metadata = { title: "Accounts" };

export default async function AccountsPage(
  props: PageProps<"/app/[workspace]/accounts">,
) {
  const { workspace } = await props.params;
  const ws = await requireWorkspace(workspace);
  const connected = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.workspaceId, ws.id));

  return (
    <PageContainer>
      <PageHeader
        title="Accounts"
        description="Connect the profiles this workspace publishes to."
      />

      {connected.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {connected.map((a) => (
            <Card key={a.id} className="flex items-center gap-3 p-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold uppercase">
                {a.platform.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.displayName}</p>
                <p className="truncate text-xs text-[var(--text-tertiary)]">
                  {a.platform}
                </p>
              </div>
              <Badge variant={a.status === "connected" ? "success" : "warning"}>
                {a.status}
              </Badge>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
        Available platforms
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {PLATFORM_CATALOG.map((p) => (
          <Card key={p.key} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                  {p.blurb}
                </p>
              </div>
              {p.needsReview ? (
                <Badge variant="outline">app review</Badge>
              ) : (
                <Badge variant="success">no review</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled
              className="self-start"
            >
              Connect — Phase 1
            </Button>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-xs text-[var(--text-ghost)]">
        Connecting requires your own registered developer app for each platform.
        JP Studio wires the OAuth flow and callback URLs; you supply the
        credentials.
      </p>
    </PageContainer>
  );
}
