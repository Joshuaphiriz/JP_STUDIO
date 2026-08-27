import { desc, eq } from "drizzle-orm";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { db } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { publicMediaUrl } from "@/lib/publish/render";
import { MediaClient } from "./media-client";

export const metadata = { title: "Media" };

export default async function MediaPage(
  props: PageProps<"/app/[workspace]/media">,
) {
  const { workspace } = await props.params;
  const ws = await requireWorkspace(workspace);

  const rows = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.workspaceId, ws.id))
    .orderBy(desc(mediaAssets.createdAt))
    .limit(200);

  const assets = rows.map((r) => ({
    id: r.id,
    url: publicMediaUrl(r.storagePath),
    kind: r.kind as "image" | "video",
    fileName: r.fileName,
    sizeBytes: r.sizeBytes,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Media library"
        description="Assets you can drop into any post."
      />
      <MediaClient workspaceSlug={ws.slug} assets={assets} />
    </PageContainer>
  );
}
