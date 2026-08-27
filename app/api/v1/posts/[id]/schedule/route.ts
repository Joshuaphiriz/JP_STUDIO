import { requireScope, withApi } from "@/lib/api/auth";
import { schedulePost } from "@/lib/api/service";

export const dynamic = "force-dynamic";

export const POST = withApi(async (ctx, request) => {
  requireScope(ctx, "posts:write");
  const parts = new URL(request.url).pathname.split("/");
  const id = parts[parts.length - 2]; // .../posts/<id>/schedule
  const body = await request.json().catch(() => ({}));
  if (typeof body.scheduled_at !== "string") {
    return Response.json(
      { error: "scheduled_at (ISO string) is required" },
      { status: 400 },
    );
  }
  return Response.json({
    post: await schedulePost(ctx, id, body.scheduled_at),
  });
});
