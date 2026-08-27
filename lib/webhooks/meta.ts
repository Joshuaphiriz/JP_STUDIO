import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { inboxMessages, socialAccounts } from "@/lib/db/schema";
import { envCredentials } from "@/lib/providers/credentials";
import { classifySentiment } from "@/lib/inbox/sentiment";

/** Verify the `X-Hub-Signature-256` header against the raw request body. */
export function verifyMetaSignature(
  rawBody: string,
  header: string | null,
): boolean {
  const creds = envCredentials("facebook");
  if (!creds || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", creds.clientSecret)
    .update(rawBody)
    .digest("hex");
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

type MetaEntry = {
  id: string; // page id (fb) or ig account id
  time?: number;
  changes?: Array<{
    field: string;
    value: Record<string, unknown>;
  }>;
};

type MetaPayload = {
  object: string; // "page" | "instagram"
  entry?: MetaEntry[];
};

/**
 * Convert a Meta webhook payload into inbox messages. Deduplicated by the
 * unique (social_account_id, platform_message_id) constraint.
 */
export async function ingestMetaWebhook(payload: MetaPayload): Promise<number> {
  const entries = payload.entry ?? [];
  if (entries.length === 0) return 0;

  const externalIds = [...new Set(entries.map((e) => e.id))];
  const accounts = await db
    .select({
      id: socialAccounts.id,
      workspaceId: socialAccounts.workspaceId,
      platform: socialAccounts.platform,
      externalId: socialAccounts.externalId,
      parentExternalId: socialAccounts.parentExternalId,
    })
    .from(socialAccounts)
    .where(inArray(socialAccounts.externalId, externalIds));

  const byExternal = new Map<string, (typeof accounts)[number]>();
  for (const a of accounts) {
    byExternal.set(a.externalId, a);
    if (a.parentExternalId) byExternal.set(a.parentExternalId, a);
  }

  let inserted = 0;
  for (const entry of entries) {
    const account = byExternal.get(entry.id);
    if (!account) continue;

    for (const change of entry.changes ?? []) {
      const v = change.value;
      const verb = (v.verb as string) ?? "add";
      if (verb === "remove" || verb === "delete") continue;

      let platformMessageId: string | undefined;
      let type: "comment" | "mention" = "comment";
      let body = "";
      let parentId: string | undefined;
      let targetPostId: string | undefined;
      let authorName: string | undefined;
      let authorId: string | undefined;

      if (change.field === "feed" || change.field === "comments") {
        if (v.item && v.item !== "comment") continue;
        platformMessageId = (v.comment_id as string) ?? (v.id as string);
        body = (v.message as string) ?? "";
        parentId = v.parent_id as string | undefined;
        targetPostId = v.post_id as string | undefined;
        const from = v.from as { id?: string; name?: string } | undefined;
        authorName = from?.name;
        authorId = from?.id;
      } else if (change.field === "mentions") {
        type = "mention";
        platformMessageId = (v.comment_id as string) ?? (v.media_id as string);
        body = (v.text as string) ?? "";
        targetPostId = v.media_id as string | undefined;
      } else {
        continue;
      }

      if (!platformMessageId) continue;

      const rows = await db
        .insert(inboxMessages)
        .values({
          workspaceId: account.workspaceId,
          socialAccountId: account.id,
          platform: account.platform,
          platformMessageId,
          type,
          parentId,
          authorName,
          authorExternalId: authorId,
          body,
          targetExternalPostId: targetPostId,
          sentiment: classifySentiment(body),
          platformCreatedAt: new Date((entry.time ?? Date.now() / 1000) * 1000),
        })
        .onConflictDoNothing()
        .returning({ id: inboxMessages.id });
      inserted += rows.length;
    }
  }
  return inserted;
}

/** Look up the verify token for the challenge handshake. */
export function metaVerifyToken(): string | undefined {
  return process.env.META_WEBHOOK_VERIFY_TOKEN;
}
