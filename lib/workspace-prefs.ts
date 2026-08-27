import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userPreferences, workspaces } from "@/lib/db/schema";
import { getOptionalUser } from "@/lib/dal";

/** Slug of the workspace the user last opened, if still accessible. */
export async function getLastWorkspaceSlug(): Promise<string | null> {
  const user = await getOptionalUser();
  if (!user) return null;
  const [pref] = await db
    .select({ lastWorkspaceId: userPreferences.lastWorkspaceId })
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id))
    .limit(1);
  if (!pref?.lastWorkspaceId) return null;
  const [ws] = await db
    .select({ slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, pref.lastWorkspaceId))
    .limit(1);
  return ws?.slug ?? null;
}

export async function rememberWorkspace(userId: string, workspaceId: string) {
  await db
    .insert(userPreferences)
    .values({ userId, lastWorkspaceId: workspaceId })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { lastWorkspaceId: workspaceId, updatedAt: new Date() },
    });
}
