import { requireScope, withApi } from "@/lib/api/auth";
import { accountAnalytics } from "@/lib/api/service";

export const dynamic = "force-dynamic";

export const GET = withApi(async (ctx, request) => {
  requireScope(ctx, "analytics:read");
  const id = new URL(request.url).pathname.split("/").at(-1)!;
  return Response.json(await accountAnalytics(ctx, id));
});
