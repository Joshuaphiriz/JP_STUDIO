const NEGATIVE =
  /\b(hate|awful|terrible|worst|broken|useless|scam|refund|angry|disappointed|never again|rip off|ripoff|garbage|trash|disgusting|unacceptable|horrible|poor|bad)\b/i;
const POSITIVE =
  /\b(love|great|awesome|amazing|excellent|perfect|thank you|thanks|best|fantastic|wonderful|brilliant|helpful|good job|well done|nice|beautiful)\b|😍|🙌|❤️|🔥/i;

/** Fast keyword sentiment. Returns undefined for anything ambiguous. */
export function classifySentiment(
  text: string,
): "positive" | "negative" | "neutral" | undefined {
  if (!text) return undefined;
  const neg = NEGATIVE.test(text);
  const pos = POSITIVE.test(text);
  if (neg && !pos) return "negative";
  if (pos && !neg) return "positive";
  if (!pos && !neg) return "neutral";
  return undefined;
}
