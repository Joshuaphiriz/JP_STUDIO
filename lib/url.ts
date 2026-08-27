import { headers } from "next/headers";

/**
 * Best stable base URL without a request in hand. Order:
 *   1. NEXT_PUBLIC_APP_URL      — explicit override (custom domain)
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the project's stable production domain
 *   3. VERCEL_URL               — this specific deployment
 *   4. localhost
 */
export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  const dep = process.env.VERCEL_URL;
  if (dep) return `https://${dep}`;
  return "http://localhost:3000";
}

/**
 * Absolute base URL of this deployment. Prefers the actual request host so that
 * preview deployments and custom domains work, then falls back to `appBaseUrl()`.
 */
export async function getAppUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ??
        (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    /* no request context */
  }
  return appBaseUrl();
}
