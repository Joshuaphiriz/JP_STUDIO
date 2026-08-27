import { authenticateApi, ApiError, requireScope } from "@/lib/api/auth";
import {
  accountAnalytics,
  createPost,
  listAccounts,
  listPosts,
  schedulePost,
} from "@/lib/api/service";

export const dynamic = "force-dynamic";

/**
 * Model Context Protocol endpoint (JSON-RPC 2.0). Authenticated with a
 * workspace API key via `Authorization: Bearer <key>`.
 */

const TOOLS = [
  {
    name: "list_accounts",
    description: "List the social accounts connected to this workspace.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_posts",
    description: "List recent posts, optionally filtered by status.",
    inputSchema: {
      type: "object",
      properties: { status: { type: "string" } },
    },
  },
  {
    name: "create_draft",
    description:
      "Create a draft post targeting one or more accounts. Returns the post.",
    inputSchema: {
      type: "object",
      required: ["caption", "account_ids"],
      properties: {
        caption: { type: "string" },
        account_ids: { type: "array", items: { type: "string" } },
        media_urls: { type: "array", items: { type: "string" } },
        first_comment: { type: "string" },
      },
    },
  },
  {
    name: "schedule_post",
    description: "Schedule an existing post for a given ISO timestamp.",
    inputSchema: {
      type: "object",
      required: ["post_id", "scheduled_at"],
      properties: {
        post_id: { type: "string" },
        scheduled_at: { type: "string" },
      },
    },
  },
  {
    name: "get_account_analytics",
    description: "Follower snapshots and top posts for one account.",
    inputSchema: {
      type: "object",
      required: ["account_id"],
      properties: { account_id: { type: "string" } },
    },
  },
];

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await authenticateApi(request);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 401;
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32001, message: "Unauthorized" },
      },
      { status },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || body.jsonrpc !== "2.0") {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Invalid Request" },
      },
      { status: 400 },
    );
  }

  const { id, method, params } = body;
  const ok = (result: unknown) => Response.json({ jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string) =>
    Response.json({ jsonrpc: "2.0", id, error: { code, message } });

  try {
    if (method === "initialize") {
      return ok({
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "jp-studio", version: "1.0.0" },
      });
    }
    if (method === "tools/list") {
      return ok({ tools: TOOLS });
    }
    if (method === "tools/call") {
      const name = params?.name as string;
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      const result = await callTool(ctx, name, args);
      return ok({
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      });
    }
    return fail(-32601, `Method not found: ${method}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool error";
    return fail(-32000, message);
  }
}

async function callTool(
  ctx: Awaited<ReturnType<typeof authenticateApi>>,
  name: string,
  args: Record<string, unknown>,
) {
  switch (name) {
    case "list_accounts":
      requireScope(ctx, "accounts:read");
      return listAccounts(ctx);
    case "list_posts":
      requireScope(ctx, "posts:read");
      return listPosts(ctx, args.status as string | undefined);
    case "create_draft":
      requireScope(ctx, "posts:write");
      return createPost(ctx, { ...args, publish: false });
    case "schedule_post":
      requireScope(ctx, "posts:write");
      return schedulePost(ctx, String(args.post_id), String(args.scheduled_at));
    case "get_account_analytics":
      requireScope(ctx, "analytics:read");
      return accountAnalytics(ctx, String(args.account_id));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
