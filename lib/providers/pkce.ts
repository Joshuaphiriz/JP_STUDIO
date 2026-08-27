import { createHash, randomBytes } from "node:crypto";

/** RFC 7636 PKCE pair. Store `verifier` with the OAuth state; send `challenge`. */
export function createPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
