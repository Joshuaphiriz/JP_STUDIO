import "server-only";
import type { PlatformKey } from "@/lib/platforms/catalog";
import { envCredentials } from "./credentials";
import { LinkedInProvider } from "./linkedin";
import { MetaProvider } from "./meta";
import { TelegramProvider } from "./telegram";
import { TikTokProvider } from "./tiktok";
import type { SocialProvider } from "./types";

export class ProviderNotConfiguredError extends Error {
  constructor(readonly platform: PlatformKey) {
    super(`No app credentials configured for ${platform}`);
    this.name = "ProviderNotConfiguredError";
  }
}

/**
 * Build a provider instance for a platform using env credentials. Throws
 * `ProviderNotConfiguredError` when the deployment hasn't supplied keys — the
 * connect UI catches this to show setup instructions.
 */
export function getProvider(platform: PlatformKey): SocialProvider {
  const creds = envCredentials(platform);

  switch (platform) {
    case "telegram":
      return new TelegramProvider();
    case "facebook":
    case "instagram":
      if (!creds) throw new ProviderNotConfiguredError(platform);
      return new MetaProvider(platform, creds.clientId, creds.clientSecret);
    case "linkedin":
      if (!creds) throw new ProviderNotConfiguredError(platform);
      return new LinkedInProvider(creds.clientId, creds.clientSecret);
    case "tiktok":
      if (!creds) throw new ProviderNotConfiguredError(platform);
      return new TikTokProvider(creds.clientId, creds.clientSecret);
    case "youtube":
      throw new ProviderNotConfiguredError(platform); // Phase 3
    default:
      throw new ProviderNotConfiguredError(platform);
  }
}

export function isPlatformConfigured(platform: PlatformKey): boolean {
  if (platform === "telegram") return true;
  return envCredentials(platform) !== null;
}
