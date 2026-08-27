import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Non-secret runtime diagnostics — reports which env vars are visible. */
export function GET() {
  const e = process.env;
  return NextResponse.json({
    ok: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(e.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(e.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(e.SUPABASE_SERVICE_ROLE_KEY),
      DATABASE_URL: Boolean(e.DATABASE_URL),
      DIRECT_URL: Boolean(e.DIRECT_URL),
      ENCRYPTION_KEY: Boolean(e.ENCRYPTION_KEY),
      CRON_SECRET: Boolean(e.CRON_SECRET),
      VERCEL_PROJECT_PRODUCTION_URL: e.VERCEL_PROJECT_PRODUCTION_URL ?? null,
    },
  });
}
