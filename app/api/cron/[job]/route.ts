import { NextResponse, type NextRequest } from "next/server";
import { pruneOAuthStates } from "@/lib/providers/accounts";
import {
  publishDuePosts,
  refreshExpiringTokens,
  runHealthChecks,
} from "@/lib/publish/run";
import { syncInbox } from "@/lib/inbox/sync";
import { runApprovalReminders } from "@/lib/approvals/reminders";
import { collectAnalytics } from "@/lib/analytics/collect";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Job runner. Authorised by a bearer `CRON_SECRET` — called by Supabase
 * `pg_cron` (via `pg_net`) on a schedule, or by Vercel Cron, or manually.
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when the
 * secret is set as an env var.
 */
const JOBS = {
  "publish-due": () => publishDuePosts(),
  "sync-inbox": () => syncInbox(),
  "collect-analytics": () => collectAnalytics(),
  "refresh-tokens": () => refreshExpiringTokens(),
  "health-check": () => runHealthChecks(),
  "approval-reminders": () => runApprovalReminders(),
  prune: async () => {
    await pruneOAuthStates();
    return { ok: true };
  },
} as const;

type JobName = keyof typeof JOBS;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return (
    header === `Bearer ${secret}` ||
    request.nextUrl.searchParams.get("secret") === secret
  );
}

async function handle(
  request: NextRequest,
  ctx: RouteContext<"/api/cron/[job]">,
) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { job } = await ctx.params;
  const fn = JOBS[job as JobName];
  if (!fn) return NextResponse.json({ error: "unknown job" }, { status: 404 });

  const started = Date.now();
  try {
    const result = await fn();
    return NextResponse.json({
      job,
      ok: true,
      ms: Date.now() - started,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      { job, ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
