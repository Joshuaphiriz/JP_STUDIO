import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

/**
 * AES-256-GCM encryption for secrets at rest (OAuth tokens, platform app keys).
 * The 32-byte key is derived from ENCRYPTION_KEY via HKDF-SHA256 with a fixed
 * info label, so the same env var can key several independent domains.
 *
 * Ciphertext format (base64): [12-byte IV][16-byte auth tag][ciphertext]
 */

function key(info: string): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("ENCRYPTION_KEY is not set");
  const ikm = Buffer.from(secret, "base64");
  return Buffer.from(hkdfSync("sha256", ikm, Buffer.alloc(0), info, 32));
}

export function encryptSecret(
  plaintext: string,
  info = "jp-studio:tokens",
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(info), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(
  payload: string,
  info = "jp-studio:tokens",
): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(info), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    "utf8",
  );
}

/** SHA-256 hex digest — for API keys, magic-link tokens, invitation tokens. */
export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** URL-safe random token (default 32 bytes). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
