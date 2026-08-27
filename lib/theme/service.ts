import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userPreferences, workspaceThemes } from "@/lib/db/schema";
import { getOptionalUser } from "@/lib/dal";
import { resolveTheme, type ResolvedTheme } from "./resolve";
import { DEFAULT_THEME, type ThemeConfig, themeConfigSchema } from "./types";

export { DEFAULT_THEME };

function safeParse(value: unknown): Partial<ThemeConfig> | null {
  if (!value || typeof value !== "object") return null;
  const parsed = themeConfigSchema.partial().safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Effective theme for the current request: personal preference wins, then the
 * active workspace's shared theme, then the built-in default. Memoized per
 * request so the layout and any nested reads share one lookup.
 */
export const getEffectiveTheme = cache(
  async (
    workspaceId?: string,
  ): Promise<{ config: ThemeConfig; resolved: ResolvedTheme }> => {
    const user = await getOptionalUser();

    let personal: Partial<ThemeConfig> | null = null;
    let workspace: Partial<ThemeConfig> | null = null;

    if (user) {
      const [pref] = await db
        .select({ theme: userPreferences.theme })
        .from(userPreferences)
        .where(eq(userPreferences.userId, user.id))
        .limit(1);
      personal = safeParse(pref?.theme);
    }

    if (workspaceId) {
      const [wt] = await db
        .select({ config: workspaceThemes.config })
        .from(workspaceThemes)
        .where(eq(workspaceThemes.workspaceId, workspaceId))
        .limit(1);
      workspace = safeParse(wt?.config);
    }

    const config = themeConfigSchema.parse({
      ...DEFAULT_THEME,
      ...workspace,
      ...personal,
    });

    return { config, resolved: resolveTheme(config) };
  },
);
