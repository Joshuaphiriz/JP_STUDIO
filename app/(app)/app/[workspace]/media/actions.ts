"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/dal";
import { deleteMedia } from "@/lib/media/store";

export async function deleteMediaAction(
  workspaceSlug: string,
  assetId: string,
) {
  const ws = await requireWorkspace(workspaceSlug);
  await deleteMedia(ws.id, assetId);
  revalidatePath(`/app/${ws.slug}/media`);
}
