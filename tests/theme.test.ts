import { describe, expect, it } from "vitest";
import { generateScale } from "@/lib/theme/palette";
import { resolveTheme } from "@/lib/theme/resolve";
import { DEFAULT_THEME, themeConfigSchema } from "@/lib/theme/types";

describe("palette", () => {
  it("generates an 11-stop scale from a base color", () => {
    const scale = generateScale("#0A84FF");
    expect(Object.keys(scale)).toHaveLength(11);
    for (const hex of Object.values(scale)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("keeps 50 lighter than 950", () => {
    const s = generateScale("#7C3AED");
    expect(parseInt(s[50].slice(1), 16)).toBeGreaterThan(
      parseInt(s[950].slice(1), 16),
    );
  });
});

describe("resolveTheme", () => {
  it("emits base, light, and dark blocks", () => {
    const { css } = resolveTheme(DEFAULT_THEME);
    expect(css).toContain(":root{");
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain("--brand-500:");
    expect(css).toContain("--radius-md:");
  });

  it("radius flows into the token", () => {
    const { css } = resolveTheme({ ...DEFAULT_THEME, radius: 4 });
    expect(css).toContain("--radius-md:4px");
  });

  it("rejects invalid config via schema, falls back on parse", () => {
    const parsed = themeConfigSchema.safeParse({ brandColor: "not-a-color" });
    expect(parsed.success).toBe(false);
  });
});
