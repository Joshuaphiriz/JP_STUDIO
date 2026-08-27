import "server-only";
import type { PlatformKey } from "@/lib/platforms/catalog";

export type AppCredentials = {
  clientId: string;
  clientSecret: string;
  extra?: Record<string, string>;
};

/**
 * Resolve the platform *app* credentials (client id/secret) for a connect flow.
 * Environment variables take precedence; a per-organization override stored in
 * `platform_credentials` is the fallback (wired in Phase 2's admin UI).
 */
export function envCredentials(platform: PlatformKey): AppCredentials | null {
  const e = process.env;
  switch (platform) {
    case "facebook":
    case "instagram":
      return pair(e.PLATFORM_META_APP_ID, e.PLATFORM_META_APP_SECRET);
    case "linkedin":
      return pair(
        e.PLATFORM_LINKEDIN_CLIENT_ID,
        e.PLATFORM_LINKEDIN_CLIENT_SECRET,
      );
    case "tiktok":
      return pair(
        e.PLATFORM_TIKTOK_CLIENT_KEY,
        e.PLATFORM_TIKTOK_CLIENT_SECRET,
      );
    case "telegram":
      return e.PLATFORM_TELEGRAM_BOT_TOKEN
        ? {
            clientId: "telegram-bot",
            clientSecret: e.PLATFORM_TELEGRAM_BOT_TOKEN,
          }
        : null;
    case "youtube":
      return pair(e.PLATFORM_GOOGLE_CLIENT_ID, e.PLATFORM_GOOGLE_CLIENT_SECRET);
  }
}

function pair(id?: string, secret?: string): AppCredentials | null {
  return id && secret ? { clientId: id, clientSecret: secret } : null;
}

export function webhookVerifyToken(platform: PlatformKey): string | undefined {
  if (platform === "facebook" || platform === "instagram") {
    return process.env.META_WEBHOOK_VERIFY_TOKEN;
  }
  return undefined;
}
