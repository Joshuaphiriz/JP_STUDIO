"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function origin() {
  const h = await headers();
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (h.get("origin") || `https://${h.get("host")}`)
  );
}

export type SignInState = { error?: string; sent?: boolean; email?: string };

const emailSchema = z.email({ error: "Enter a valid email address." });

export async function signInWithEmail(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = emailSchema.safeParse(
    String(formData.get("email") ?? "").trim(),
  );
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error).split("\n")[0] };
  }
  const email = parsed.data;
  const next = String(formData.get("next") ?? "/app");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { error: error.message, email };
  return { sent: true, email };
}

export async function signInWithGoogle(formData: FormData) {
  const next = String(formData.get("next") ?? "/app");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) redirect(`/sign-in?error=oauth`);
  redirect(data.url);
}
