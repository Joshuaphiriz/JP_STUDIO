import type { Metadata } from "next";
import { LegalDoc } from "../_doc";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service" updated="27 August 2026">
      <p>
        These terms govern your use of this instance of JP Studio (&ldquo;the
        Service&rdquo;), operated by the individual or organization who deployed
        it (&ldquo;the Operator&rdquo;). By creating an account or using the
        Service you agree to these terms.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>
          You are responsible for activity under your account and for keeping
          your sign-in method secure.
        </li>
        <li>
          You must be old enough to form a binding contract in your
          jurisdiction.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <ul>
        <li>
          Use the Service only to manage social accounts you are authorized to
          manage.
        </li>
        <li>
          Comply with the terms, policies, and rate limits of every connected
          platform (Meta, LinkedIn, TikTok, YouTube, Telegram, and others). Your
          platform accounts remain subject to those platforms&apos; own rules.
        </li>
        <li>
          Do not use the Service to publish unlawful content, spam, malware, or
          content that infringes others&apos; rights; do not attempt to disrupt
          or reverse-engineer the Service.
        </li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain all rights to the content you create and publish through the
        Service. You grant the Service permission to store, process, and
        transmit that content to the platforms you select, solely to provide the
        Service.
      </p>

      <h2>Third-party platforms</h2>
      <p>
        The Service connects to external platforms through their public APIs.
        Those platforms may change, restrict, or discontinue their APIs at any
        time, which can affect features such as publishing, analytics, or the
        inbox. The Operator is not responsible for platform outages, policy
        changes, or actions those platforms take against your accounts.
      </p>

      <h2>Availability and changes</h2>
      <p>
        The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; basis. Features may change or be removed. Scheduled
        publishing depends on background jobs and third-party APIs and is not
        guaranteed to execute at an exact time.
      </p>

      <h2>Disclaimer and liability</h2>
      <p>
        To the maximum extent permitted by law, the Operator disclaims all
        warranties and is not liable for any indirect, incidental, or
        consequential damages, or for lost profits, data, or goodwill arising
        from your use of the Service.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the Service and delete your data at any time. The
        Operator may suspend or terminate access for violations of these terms.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        These terms may be updated; continued use after a change constitutes
        acceptance. The &ldquo;last updated&rdquo; date reflects the current
        version.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms should be directed to the Operator.</p>
    </LegalDoc>
  );
}
