import { withApi } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export const GET = withApi(async (ctx) =>
  Response.json({
    workspace_id: ctx.workspaceId,
    workspace_slug: ctx.workspaceSlug,
    organization_id: ctx.organizationId,
    scopes: ctx.scopes,
  }),
);
