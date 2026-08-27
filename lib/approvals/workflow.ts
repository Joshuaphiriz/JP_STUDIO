import type { ApprovalMode, PostStatus } from "@/lib/db/schema";

export type SubmitIntent = "schedule" | "publish";
export type Stage = "internal" | "client";
export type Decision = "approved" | "changes_requested" | "rejected";

export type SubmitPlan = {
  /** the status the post should take */
  status: PostStatus;
  /** true when it entered a review queue rather than going live */
  awaitingApproval: boolean;
  stage?: Stage;
};

/**
 * Decide where a post goes when the author hits Schedule / Publish, given the
 * workspace approval mode and whether the author can publish directly.
 */
export function planSubmit(
  mode: ApprovalMode,
  perms: { canPublish: boolean; canApproveInternal: boolean },
  intent: SubmitIntent,
): SubmitPlan {
  const live: PostStatus = "scheduled"; // pipeline treats publish-now as scheduled@now
  void intent;

  if (mode === "none") {
    return perms.canPublish
      ? { status: live, awaitingApproval: false }
      : { status: "pending_review", awaitingApproval: true, stage: "internal" };
  }

  if (mode === "optional") {
    return perms.canPublish
      ? { status: live, awaitingApproval: false }
      : { status: "pending_review", awaitingApproval: true, stage: "internal" };
  }

  if (mode === "required_internal") {
    return perms.canApproveInternal
      ? { status: live, awaitingApproval: false }
      : { status: "pending_review", awaitingApproval: true, stage: "internal" };
  }

  // required_internal_client — always at least internal review first
  return {
    status: "pending_review",
    awaitingApproval: true,
    stage: "internal",
  };
}

export type DecisionPlan = {
  status: PostStatus;
  nextStage?: Stage;
  closed: boolean;
};

/** Resulting post status after a reviewer decision at a stage. */
export function planDecision(
  mode: ApprovalMode,
  stage: Stage,
  decision: Decision,
  hasSchedule: boolean,
): DecisionPlan {
  if (decision === "changes_requested") {
    return { status: "changes_requested", closed: false };
  }
  if (decision === "rejected") {
    return { status: "draft", closed: true };
  }
  // approved
  if (stage === "internal" && mode === "required_internal_client") {
    return { status: "pending_client", nextStage: "client", closed: false };
  }
  return { status: hasSchedule ? "scheduled" : "approved", closed: true };
}

export function stageLabel(stage: Stage) {
  return stage === "internal" ? "Internal review" : "Client review";
}
