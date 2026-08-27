import "server-only";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { inboxMessages, socialAccounts } from "@/lib/db/schema";
import { getAccountToken } from "@/lib/providers/accounts";
import { getProvider } from "@/lib/providers/registry";
import { classifySentiment } from "./sentiment";

/**
 * Pull recent comments/mentions/DMs for every connected account whose provider
 * supports it, into `inbox_messages`. Deduplicated on (account, platformMessageId).
 * Runs on the `sync-inbox` cron (every ~5 min).
 */
export async function syncInbox(
  sinceMs = 24 * 3600 * 1000,
): Promise<{ accounts: number; inserted: number }> {
  const accounts = await db
    .select({
      id: socialAccounts.id,
      workspaceId: socialAccounts.workspaceId,
      platform: socialAccounts.platform,
    })
    .from(socialAccounts)
    .where(inArray(socialAccounts.status, ["connected", "token_expiring"]));

  const since = new Date(Date.now() - sinceMs);
  let inserted = 0;
  let checked = 0;

  for (const account of accounts) {
    const provider = (() => {
      try {
        return getProvider(account.platform);
      } catch {
        return null;
      }
    })();
    if (!provider?.getMessages) continue;
    checked++;

    let messages;
    try {
      const { token, profile } = await getAccountToken(account.id);
      messages = await provider.getMessages(token, profile, since);
    } catch {
      continue;
    }

    for (const m of messages) {
      const rows = await db
        .insert(inboxMessages)
        .values({
          workspaceId: account.workspaceId,
          socialAccountId: account.id,
          platform: account.platform,
          platformMessageId: m.platformMessageId,
          type: m.type,
          threadId: m.threadId,
          parentId: m.parentId,
          authorName: m.authorName,
          authorHandle: m.authorHandle,
          authorExternalId: m.authorExternalId,
          body: m.body,
          permalink: m.permalink,
          targetExternalPostId: m.targetExternalPostId,
          sentiment: classifySentiment(m.body),
          platformCreatedAt: m.createdAt,
        })
        .onConflictDoNothing()
        .returning({ id: inboxMessages.id });
      inserted += rows.length;
    }

    await db
      .update(socialAccounts)
      .set({ lastSyncedAt: new Date() })
      .where(eq(socialAccounts.id, account.id));
  }

  return { accounts: checked, inserted };
}
