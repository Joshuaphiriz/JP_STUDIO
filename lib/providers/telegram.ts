import { CAPABILITIES } from "@/lib/platforms/capabilities";
import { apiFetch, ProviderHttpError } from "./http";
import type {
  ProviderProfile,
  PublishContent,
  PublishResult,
  SocialProvider,
  TokenSet,
} from "./types";

const API = "https://api.telegram.org";

/**
 * Telegram provider. There is no OAuth: the "token" is the bot token, and each
 * connected account is a channel/chat the bot administers. The connect flow
 * (Phase 1 UI) asks for the bot token + channel @username instead of a redirect.
 */
export class TelegramProvider implements SocialProvider {
  readonly platform = "telegram" as const;
  readonly capabilities = CAPABILITIES.telegram;
  readonly usesPkce = false;

  getAuthUrl(): string {
    throw new Error("Telegram connects with a bot token, not OAuth");
  }

  async exchangeCode(): Promise<TokenSet> {
    throw new Error("Telegram connects with a bot token, not OAuth");
  }

  /** Validate a bot token and return the bot identity. */
  async verifyBot(botToken: string): Promise<ProviderProfile> {
    const me = await tg<{ id: number; username: string; first_name: string }>(
      botToken,
      "getMe",
    );
    return {
      externalId: String(me.id),
      displayName: me.first_name,
      handle: me.username ? `@${me.username}` : undefined,
    };
  }

  /** Resolve a channel the bot administers into a connectable profile. */
  async resolveChannel(
    botToken: string,
    channel: string,
  ): Promise<ProviderProfile> {
    const chat = await tg<{
      id: number;
      title?: string;
      username?: string;
      type: string;
    }>(botToken, "getChat", { chat_id: normalizeChannel(channel) });
    return {
      externalId: String(chat.id),
      displayName: chat.title ?? channel,
      handle: chat.username ? `@${chat.username}` : undefined,
      meta: { type: chat.type },
    };
  }

  async listProfiles(token: TokenSet): Promise<ProviderProfile[]> {
    const channel = token.extra?.channel as string | undefined;
    if (!channel) return [];
    return [await this.resolveChannel(token.accessToken, channel)];
  }

  async publish(
    token: TokenSet,
    profile: ProviderProfile,
    content: PublishContent,
  ): Promise<PublishResult> {
    const botToken = token.accessToken;
    const chatId = profile.externalId;

    try {
      const images = content.media.filter((m) => m.kind === "image");
      const videos = content.media.filter((m) => m.kind === "video");

      if (content.media.length === 0) {
        const res = await tg<{ message_id: number }>(botToken, "sendMessage", {
          chat_id: chatId,
          text: content.caption,
          disable_web_page_preview: false,
        });
        return ok(res.message_id, profile);
      }

      if (videos.length === 1 && images.length === 0) {
        const res = await tg<{ message_id: number }>(botToken, "sendVideo", {
          chat_id: chatId,
          video: videos[0].url,
          caption: content.caption,
        });
        return ok(res.message_id, profile);
      }

      if (content.media.length === 1) {
        const res = await tg<{ message_id: number }>(botToken, "sendPhoto", {
          chat_id: chatId,
          photo: images[0].url,
          caption: content.caption,
        });
        return ok(res.message_id, profile);
      }

      const group = content.media.slice(0, 10).map((m, i) => ({
        type: m.kind === "video" ? "video" : "photo",
        media: m.url,
        caption: i === 0 ? content.caption : undefined,
      }));
      const res = await tg<Array<{ message_id: number }>>(
        botToken,
        "sendMediaGroup",
        { chat_id: chatId, media: group },
      );
      return ok(res[0]?.message_id, profile);
    } catch (err) {
      return fail(err);
    }
  }

  async checkHealth(token: TokenSet, profile: ProviderProfile) {
    try {
      await tg(token.accessToken, "getChat", { chat_id: profile.externalId });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  }
}

async function tg<T>(
  botToken: string,
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const data = await apiFetch<{ ok: boolean; result: T; description?: string }>(
    `${API}/bot${botToken}/${method}`,
    { method: "POST", body: params ?? {} },
  );
  if (!data.ok)
    throw new Error(data.description ?? `Telegram ${method} failed`);
  return data.result;
}

function normalizeChannel(channel: string) {
  const t = channel.trim();
  if (/^-?\d+$/.test(t)) return t;
  return t.startsWith("@") ? t : `@${t}`;
}

function ok(
  messageId: number | undefined,
  profile: ProviderProfile,
): PublishResult {
  const handle = profile.handle?.replace(/^@/, "");
  return {
    ok: true,
    externalPostId: messageId ? String(messageId) : undefined,
    permalink:
      handle && messageId ? `https://t.me/${handle}/${messageId}` : undefined,
  };
}

function fail(err: unknown): PublishResult {
  const retryable = err instanceof ProviderHttpError ? err.retryable : true;
  return { ok: false, error: { message: (err as Error).message, retryable } };
}
