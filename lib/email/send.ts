import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send a transactional email via Resend. When RESEND_API_KEY is not configured
 * the call is a no-op (logged in dev) so the rest of the app keeps working.
 */
export async function sendEmail({ to, subject, html, text }: SendArgs) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "JP Studio <onboarding@resend.dev>";
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:skipped] → ${to} :: ${subject}`);
    }
    return { sent: false, reason: "no_api_key" as const };
  }
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) {
    return { sent: false, reason: "send_failed" as const, status: res.status };
  }
  return { sent: true as const };
}

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1f24">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="440" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e2e5ea;border-radius:16px;overflow:hidden">
  <tr><td style="padding:28px 28px 8px"><strong style="font-size:15px">JP Studio</strong></td></tr>
  <tr><td style="padding:0 28px 8px"><h1 style="margin:0;font-size:18px">${title}</h1></td></tr>
  <tr><td style="padding:8px 28px 28px;font-size:14px;line-height:1.6;color:#5b616e">${body}</td></tr>
  </table></td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#0a84ff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px;margin-top:8px">${label}</a>`;
}

export function sendInviteEmail(args: {
  to: string;
  workspace: string;
  url: string;
  role: string;
}) {
  return sendEmail({
    to: args.to,
    subject: `You're invited to ${args.workspace} on JP Studio`,
    text: `Join ${args.workspace} as ${args.role}: ${args.url}`,
    html: shell(
      `Join ${args.workspace}`,
      `You've been invited to the <strong>${args.workspace}</strong> workspace as <strong>${args.role}</strong>.<br><br>${button(args.url, "Accept invitation")}<br><br>This link expires in 14 days.`,
    ),
  });
}

export function sendApprovalEmail(args: {
  to: string;
  workspace: string;
  url: string;
  count: number;
}) {
  return sendEmail({
    to: args.to,
    subject: `${args.count} post${args.count > 1 ? "s" : ""} awaiting your review — ${args.workspace}`,
    text: `Review pending posts: ${args.url}`,
    html: shell(
      "Posts awaiting review",
      `${args.count} post${args.count > 1 ? "s are" : " is"} waiting for your approval in <strong>${args.workspace}</strong>.<br><br>${button(args.url, "Review posts")}`,
    ),
  });
}
