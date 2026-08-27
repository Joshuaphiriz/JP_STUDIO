import { NextResponse, type NextRequest } from "next/server";
import {
  ingestMetaWebhook,
  metaVerifyToken,
  verifyMetaSignature,
} from "@/lib/webhooks/meta";

export const dynamic = "force-dynamic";

/** Webhook verification handshake (Meta: GET with hub.* query params). */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/webhooks/[platform]">,
) {
  const { platform } = await ctx.params;
  const sp = request.nextUrl.searchParams;

  if (
    platform === "meta" ||
    platform === "facebook" ||
    platform === "instagram"
  ) {
    const mode = sp.get("hub.mode");
    const token = sp.get("hub.verify_token");
    const challenge = sp.get("hub.challenge");
    if (mode === "subscribe" && token && token === metaVerifyToken()) {
      return new NextResponse(challenge ?? "", { status: 200 });
    }
    return new NextResponse("forbidden", { status: 403 });
  }

  return new NextResponse("not found", { status: 404 });
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/webhooks/[platform]">,
) {
  const { platform } = await ctx.params;
  const raw = await request.text();

  if (
    platform === "meta" ||
    platform === "facebook" ||
    platform === "instagram"
  ) {
    if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"))) {
      return new NextResponse("invalid signature", { status: 401 });
    }
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return new NextResponse("bad json", { status: 400 });
    }
    // respond fast; process inline (payloads are small)
    try {
      await ingestMetaWebhook(
        payload as Parameters<typeof ingestMetaWebhook>[0],
      );
    } catch {
      /* swallow — Meta retries on non-200, we don't want a loop */
    }
    return new NextResponse("ok", { status: 200 });
  }

  return new NextResponse("not found", { status: 404 });
}
