import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "@/lib/platforms/capabilities";
import { PLATFORM_CATALOG } from "@/lib/platforms/catalog";
import { createPkcePair } from "@/lib/providers/pkce";
import { TikTokProvider } from "@/lib/providers/tiktok";
import { LinkedInProvider } from "@/lib/providers/linkedin";
import { MetaProvider } from "@/lib/providers/meta";

describe("capabilities", () => {
  it("declares every catalog platform", () => {
    for (const p of PLATFORM_CATALOG) {
      expect(CAPABILITIES[p.key]).toBeDefined();
      expect(CAPABILITIES[p.key].platform).toBe(p.key);
    }
  });

  it("carousel limits are sane", () => {
    for (const cap of Object.values(CAPABILITIES)) {
      expect(cap.media.maxItems).toBeGreaterThanOrEqual(1);
      expect(cap.captionMax).toBeGreaterThan(0);
    }
  });
});

describe("PKCE", () => {
  it("produces a verifier and a matching S256 challenge", () => {
    const a = createPkcePair();
    const b = createPkcePair();
    expect(a.verifier).not.toEqual(b.verifier);
    expect(a.challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("auth URLs", () => {
  it("TikTok includes client_key and PKCE params", () => {
    const url = new TikTokProvider("KEY", "SECRET").getAuthUrl({
      redirectUri: "https://app.example.com/api/oauth/tiktok/callback",
      state: "s",
      codeChallenge: "c".repeat(43),
    });
    const u = new URL(url);
    expect(u.searchParams.get("client_key")).toBe("KEY");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("LinkedIn requests w_member_social", () => {
    const url = new LinkedInProvider("id", "secret").getAuthUrl({
      redirectUri: "https://app.example.com/api/oauth/linkedin/callback",
      state: "s",
    });
    expect(new URL(url).searchParams.get("scope")).toContain("w_member_social");
  });

  it("Meta unions FB + IG scopes", () => {
    const url = new MetaProvider("instagram", "app", "secret").getAuthUrl({
      redirectUri: "https://app.example.com/api/oauth/instagram/callback",
      state: "s",
    });
    const scope = new URL(url).searchParams.get("scope") ?? "";
    expect(scope).toContain("instagram_content_publish");
    expect(scope).toContain("pages_manage_posts");
  });
});
