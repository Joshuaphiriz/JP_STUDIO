import { NextResponse, type NextRequest } from "next/server";
import { PLATFORM_CATALOG, type PlatformKey } from "@/lib/platforms/catalog";
import { requireWorkspace } from "@/lib/dal";
import { getAppUrl } from "@/lib/url";
import { ProviderNotConfiguredError } from "@/lib/providers/registry";
import { startOAuthConnect } from "@/lib/providers/accounts";

const VALID = new Set(PLATFORM_CATALOG.map((p) => p.key));

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/oauth/[platform]/start">,
) {
  const { platform } = await ctx.params;
  const workspaceSlug = request.nextUrl.searchParams.get("workspace");

  if (!VALID.has(platform as PlatformKey) || !workspaceSlug) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (platform === "telegram") {
    return NextResponse.json(
      { error: "Telegram connects with a bot token, not OAuth" },
      { status: 400 },
    );
  }

  const ws = await requireWorkspace(workspaceSlug); // redirects if not a member
  const back = `${await getAppUrl()}/app/${ws.slug}/accounts`;

  try {
    const url = await startOAuthConnect({
      workspaceId: ws.id,
      userId: ws.user.id,
      platform: platform as PlatformKey,
      appUrl: await getAppUrl(),
    });
    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof ProviderNotConfiguredError) {
      return NextResponse.redirect(
        `${back}?error=not_configured&platform=${platform}`,
      );
    }
    return NextResponse.redirect(
      `${back}?error=${encodeURIComponent((err as Error).message)}`,
    );
  }
}
