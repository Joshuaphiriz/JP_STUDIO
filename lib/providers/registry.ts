import "server-only";
import { CAPABILITIES } from "@/lib/platforms/capabilities";
import type { PlatformKey } from "@/lib/platforms/catalog";
import { envCredentials } from "./credentials";
import { LinkedInProvider } from "./linkedin";
import { MetaProvider } from "./meta";
import { TelegramProvider } from "./telegram";
import { TikTokProvider } from "./tiktok";
import type { SocialProvider } from "./types";

export class ProviderNotConfiguredError extends Error {
  constructor(readonly platform: string) {
    super(`Platform "${platform}" is not available on this deployment`);
    this.name = "ProviderNotConfiguredError";
  }
}

/** The platforms JP Studio has provider implementations for. */
export function isSupportedPlatform(platform: string): platform is PlatformKey {
  return platform in CAPABILITIES;
}

/**
 * Build a provider instance for a platform using env credentials. Accepts the
 * raw DB platform value; throws `ProviderNotConfiguredError` for unsupported
 * platforms or missing keys — the connect UI catches this.
 */
export function getProvider(platform: string): SocialProvider {
  if (!isSupportedPlatform(platform))
    throw new ProviderNotConfiguredError(platform);
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

export function isPlatformConfigured(platform: string): boolean {
  if (!isSupportedPlatform(platform)) return false;
  if (platform === "telegram") return true;
  return envCredentials(platform) !== null;
}
