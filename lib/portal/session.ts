import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clientPortalTokens, workspaces } from "@/lib/db/schema";
import { sha256Hex } from "@/lib/crypto";

export type PortalSession = {
  tokenId: string;
  label: string;
  workspaceId: string;
  workspaceName: string;
  organizationId: string;
};

/** Resolve a raw portal token to a workspace, or null if invalid/expired/revoked. */
export async function resolvePortalToken(
  token: string,
): Promise<PortalSession | null> {
  if (!token || token.length < 20) return null;
  const hash = await sha256Hex(token);
  const [row] = await db
    .select({
      tokenId: clientPortalTokens.id,
      label: clientPortalTokens.label,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      organizationId: workspaces.organizationId,
    })
    .from(clientPortalTokens)
    .innerJoin(workspaces, eq(workspaces.id, clientPortalTokens.workspaceId))
    .where(
      and(
        eq(clientPortalTokens.tokenHash, hash),
        isNull(clientPortalTokens.revokedAt),
        gt(clientPortalTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) return null;

  await db
    .update(clientPortalTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(clientPortalTokens.id, row.tokenId));

  return row;
}
