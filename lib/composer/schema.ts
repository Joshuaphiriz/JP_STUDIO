import { z } from "zod";

export const platformOverrideSchema = z.object({
  socialAccountId: z.string().uuid(),
  captionOverride: z.string().max(64000).nullable().optional(),
  firstCommentOverride: z.string().max(4000).nullable().optional(),
  mediaIdsOverride: z.array(z.string().uuid()).nullable().optional(),
  options: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const composerInputSchema = z.object({
  postId: z.string().uuid().optional(),
  caption: z.string().max(64000).default(""),
  mediaIds: z.array(z.string().uuid()).default([]),
  firstComment: z.string().max(4000).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  tags: z.array(z.string().max(40)).default([]),
  internalNotes: z.string().max(4000).nullable().optional(),
  /** target social account ids */
  accountIds: z.array(z.string().uuid()).default([]),
  overrides: z.array(platformOverrideSchema).default([]),
  /** ISO string in the user's tz, converted to UTC by the caller */
  scheduledAt: z.string().datetime().nullable().optional(),
});

export type ComposerInput = z.infer<typeof composerInputSchema>;
