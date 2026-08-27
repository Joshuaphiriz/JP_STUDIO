import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>
      <div className="mt-8 space-y-4 leading-relaxed text-[var(--text-secondary)]">
        <p>
          This is a placeholder policy. Before requesting production access from
          Meta, TikTok, or LinkedIn, replace this page with a policy reviewed
          for your jurisdiction and business.
        </p>
        <h2 className="pt-4 text-lg font-semibold text-[var(--text-primary)]">
          What we store
        </h2>
        <p>
          Account identity from your chosen sign-in provider, the social
          accounts you connect (including OAuth tokens, encrypted at rest), the
          content you create, and analytics we retrieve from connected platforms
          on your behalf.
        </p>
        <h2 className="pt-4 text-lg font-semibold text-[var(--text-primary)]">
          Deleting your data
        </h2>
        <p>
          Disconnecting an account revokes its tokens. Deleting a workspace or
          organization permanently removes its data after a grace period.
        </p>
        <h2 className="pt-4 text-lg font-semibold text-[var(--text-primary)]">
          Contact
        </h2>
        <p>Reach the operator of this instance for any privacy request.</p>
      </div>
    </article>
  );
}
