import type { Metadata } from "next";
import { LegalDoc } from "../_doc";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" updated="27 August 2026">
      <p>
        JP Studio (&ldquo;the Service&rdquo;) is a social media management tool.
        This policy explains what data the Service collects, why, and how you
        can control it. The Service is operated by the individual or
        organization who deployed this instance (&ldquo;the Operator&rdquo;);
        contact them for any request described below.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account information</strong> — your name, email address, and
          profile picture, supplied by your sign-in provider (email magic link
          or Google) when you create an account.
        </li>
        <li>
          <strong>Connected social accounts</strong> — when you connect a social
          platform (Facebook, Instagram, LinkedIn, TikTok, YouTube, Telegram,
          and others), we store the account&apos;s public profile details and
          the OAuth access and refresh tokens the platform issues. Tokens are
          encrypted at rest using AES-256-GCM.
        </li>
        <li>
          <strong>Content you create</strong> — drafts, scheduled and published
          posts, captions, uploaded media, comments, approval decisions, and
          internal notes.
        </li>
        <li>
          <strong>Data retrieved on your behalf</strong> — post analytics,
          follower counts, and inbound comments, mentions, and messages that we
          fetch from connected platforms using the access you granted.
        </li>
        <li>
          <strong>Operational data</strong> — audit logs of significant actions,
          and standard server logs (IP address, request metadata) kept for
          security and debugging.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>
          To provide the Service — composing, scheduling, and publishing your
          content, and showing your analytics and inbox.
        </li>
        <li>
          To act on connected platforms strictly as you direct — for example
          publishing a post you scheduled or sending a reply you wrote.
        </li>
        <li>To secure the Service and investigate abuse.</li>
      </ul>
      <p>
        We do not sell your data, and we do not use the content of your posts or
        messages for advertising or to train models.
      </p>

      <h2>Google user data</h2>
      <p>
        If you sign in with Google, we receive your email address, basic profile
        information, and Google account ID solely to create and identify your
        account. If you connect a Google service (such as YouTube), the scopes
        you grant are used only to perform the actions you request in the
        Service. Our use of information received from Google APIs adheres to the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>

      <h2>Sharing</h2>
      <p>
        Data is shared only with: the connected platforms you choose, when
        carrying out your instructions; infrastructure providers that host the
        Service (Supabase for the database and file storage, Vercel for
        application hosting, and an email provider for transactional email); and
        other members of a workspace you belong to, according to their role.
      </p>

      <h2>Retention and deletion</h2>
      <ul>
        <li>
          Disconnecting a social account immediately revokes and deletes its
          stored tokens.
        </li>
        <li>
          Deleting a workspace or organization permanently removes its content,
          media, analytics, and inbox data after a short grace period.
        </li>
        <li>
          Server and audit logs are retained for a limited period and then
          discarded.
        </li>
        <li>To delete your account entirely, contact the Operator.</li>
      </ul>

      <h2>Security</h2>
      <p>
        All traffic is encrypted in transit (HTTPS). Credentials and platform
        tokens are encrypted at rest. Database access is restricted with
        row-level security so members only reach data for workspaces they belong
        to.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy; the &ldquo;last updated&rdquo; date reflects
        the latest version. Material changes will be surfaced in the app.
      </p>

      <h2>Contact</h2>
      <p>
        For access, correction, export, or deletion requests, contact the
        Operator of this instance.
      </p>
    </LegalDoc>
  );
}
