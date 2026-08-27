import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { workspaces } from "@/lib/db/schema";
import { getOptionalUser } from "@/lib/dal";
import { getAppUrl } from "@/lib/url";
import { completeOAuthConnect } from "@/lib/providers/accounts";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/oauth/[platform]/callback">,
) {
  const { platform } = await ctx.params;
  const sp = request.nextUrl.searchParams;
  const appUrl = await getAppUrl();
  const fallback = `${appUrl}/app`;

  const oauthError = sp.get("error") ?? sp.get("error_description");
  const code = sp.get("code");
  const state = sp.get("state");

  if (oauthError) {
    return NextResponse.redirect(
      `${fallback}?connect_error=${encodeURIComponent(oauthError)}`,
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(`${fallback}?connect_error=missing_code`);
  }

  // Require a signed-in user (defence in depth; the state row is the real gate).
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.redirect(`${appUrl}/sign-in?next=/app`);
  }

  try {
    const result = await completeOAuthConnect({ code, state });
    const [ws] = await db
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, result.workspaceId))
      .limit(1);
    const names = result.connected.map((c) => c.displayName).join(", ");
    return NextResponse.redirect(
      `${appUrl}/app/${ws?.slug ?? ""}/accounts?connected=${encodeURIComponent(names)}`,
    );
  } catch (err) {
    return NextResponse.redirect(
      `${fallback}?connect_error=${encodeURIComponent((err as Error).message)}`,
    );
  }
}

export const dynamic = "force-dynamic";
