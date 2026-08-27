import { requireScope, withApi } from "@/lib/api/auth";
import { listAccounts } from "@/lib/api/service";

export const dynamic = "force-dynamic";

export const GET = withApi(async (ctx) => {
  requireScope(ctx, "accounts:read");
  return Response.json({ accounts: await listAccounts(ctx) });
});
