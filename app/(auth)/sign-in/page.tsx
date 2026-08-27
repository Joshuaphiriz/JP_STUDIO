import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/app";
  const initialError =
    sp.error === "oauth" ? "Google sign-in failed. Try again." : undefined;

  return <SignInForm next={next} initialError={initialError} />;
}
