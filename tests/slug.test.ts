import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("Acme Coffee Co.")).toBe("acme-coffee-co");
  });
  it("trims leading/trailing separators", () => {
    expect(slugify("  !!Hello!!  ")).toBe("hello");
  });
  it("caps length at 40", () => {
    expect(slugify("a".repeat(80)).length).toBeLessThanOrEqual(40);
  });
  it("handles empty-ish input", () => {
    expect(slugify("©")).toBe("");
  });
});
