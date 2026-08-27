import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/** Shared shell for the legal pages. */
export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-14">
      <Link href="/" className="inline-block">
        <Logo />
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">
        Last updated: {updated}
      </p>
      <article className="mt-8 space-y-4 leading-relaxed text-[var(--text-secondary)] [&_a]:text-[var(--primary)] [&_a]:underline [&_h2]:pt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[var(--text-primary)] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </article>
      <p className="mt-12 text-xs text-[var(--text-ghost)]">
        <Link href="/legal/privacy">Privacy</Link> ·{" "}
        <Link href="/legal/terms">Terms</Link> · <Link href="/">Home</Link>
      </p>
    </div>
  );
}
