"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { themeConfigSchema } from "@/lib/theme/types";

export type SaveThemeResult = { ok: boolean; error?: string };

export async function savePersonalTheme(
  raw: unknown,
): Promise<SaveThemeResult> {
  const user = await verifySession();
  const parsed = themeConfigSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid theme." };

  await db
    .insert(userPreferences)
    .values({ userId: user.id, theme: parsed.data })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { theme: parsed.data, updatedAt: new Date() },
    });

  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function resetPersonalTheme(): Promise<SaveThemeResult> {
  const user = await verifySession();
  await db
    .insert(userPreferences)
    .values({ userId: user.id, theme: null })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { theme: null, updatedAt: new Date() },
    });
  revalidatePath("/app", "layout");
  return { ok: true };
}
