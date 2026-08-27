import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60rem 40rem at 50% -10%, var(--primary-soft), transparent 60%)",
        }}
      />
      <Link href="/" className="mb-8" aria-label="JP Studio home">
        <Logo />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-8 text-center text-xs text-[var(--text-tertiary)]">
        By continuing you agree to our{" "}
        <Link
          href="/legal/terms"
          className="underline hover:text-[var(--text-primary)]"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/legal/privacy"
          className="underline hover:text-[var(--text-primary)]"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
