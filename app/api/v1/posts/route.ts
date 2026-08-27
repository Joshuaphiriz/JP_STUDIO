import { requireScope, withApi } from "@/lib/api/auth";
import { createPost, listPosts } from "@/lib/api/service";

export const dynamic = "force-dynamic";

export const GET = withApi(async (ctx, request) => {
  requireScope(ctx, "posts:read");
  const status = new URL(request.url).searchParams.get("status") ?? undefined;
  return Response.json({ posts: await listPosts(ctx, status) });
});

export const POST = withApi(async (ctx, request) => {
  requireScope(ctx, "posts:write");
  const body = await request.json().catch(() => ({}));
  const post = await createPost(ctx, body);
  return Response.json({ post }, { status: 201 });
});
