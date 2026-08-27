import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { apiKeys, organizations, workspaces } from "@/lib/db/schema";
import { sha256Hex } from "@/lib/crypto";

export type ApiContext = {
  workspaceId: string;
  workspaceSlug: string;
  organizationId: string;
  scopes: string[];
  keyId: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Resolve `Authorization: Bearer jps_...` to a workspace context, or throw. */
export async function authenticateApi(request: Request): Promise<ApiContext> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new ApiError(401, "Missing bearer token");

  const hash = await sha256Hex(token);
  const [row] = await db
    .select({
      keyId: apiKeys.id,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
      workspaceId: workspaces.id,
      workspaceSlug: workspaces.slug,
      organizationId: organizations.id,
    })
    .from(apiKeys)
    .innerJoin(workspaces, eq(workspaces.id, apiKeys.workspaceId))
    .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!row) throw new ApiError(401, "Invalid API key");
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, "API key expired");
  }

  // fire-and-forget last-used bump
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.keyId))
    .catch(() => {});

  return {
    keyId: row.keyId,
    workspaceId: row.workspaceId,
    workspaceSlug: row.workspaceSlug,
    organizationId: row.organizationId,
    scopes: row.scopes,
  };
}

export function requireScope(ctx: ApiContext, scope: string) {
  if (ctx.scopes.includes("*") || ctx.scopes.includes(scope)) return;
  throw new ApiError(403, `Missing scope: ${scope}`);
}

/** Wrap a handler with auth + uniform error shapes. */
export function withApi(
  handler: (ctx: ApiContext, request: Request) => Promise<Response>,
) {
  return async (request: Request) => {
    try {
      const ctx = await authenticateApi(request);
      return await handler(ctx, request);
    } catch (err) {
      if (err instanceof ApiError) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof z.ZodError) {
        return Response.json(
          { error: "Invalid request body", details: z.treeifyError(err) },
          { status: 400 },
        );
      }
      return Response.json({ error: "Internal error" }, { status: 500 });
    }
  };
}
