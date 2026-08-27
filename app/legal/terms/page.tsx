import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>
      <div className="mt-8 space-y-4 leading-relaxed text-[var(--text-secondary)]">
        <p>
          Placeholder terms. Replace before any public launch. By using this
          instance you agree to use connected platform APIs within each
          platform&apos;s own terms and to be responsible for the content you
          publish.
        </p>
      </div>
    </article>
  );
}
