import { describe, expect, it } from "vitest";
import { planDecision, planSubmit } from "@/lib/approvals/workflow";
import { can } from "@/lib/rbac";

describe("planSubmit", () => {
  it("no approval: publisher goes live, non-publisher goes to review", () => {
    expect(
      planSubmit(
        "none",
        { canPublish: true, canApproveInternal: false },
        "publish",
      ).status,
    ).toBe("scheduled");
    expect(
      planSubmit(
        "none",
        { canPublish: false, canApproveInternal: false },
        "publish",
      ).awaitingApproval,
    ).toBe(true);
  });

  it("required_internal: approver skips the queue", () => {
    expect(
      planSubmit(
        "required_internal",
        { canPublish: true, canApproveInternal: true },
        "schedule",
      ).awaitingApproval,
    ).toBe(false);
    expect(
      planSubmit(
        "required_internal",
        { canPublish: true, canApproveInternal: false },
        "schedule",
      ).status,
    ).toBe("pending_review");
  });

  it("required_internal_client always starts at internal review", () => {
    const p = planSubmit(
      "required_internal_client",
      { canPublish: true, canApproveInternal: true },
      "publish",
    );
    expect(p.stage).toBe("internal");
    expect(p.awaitingApproval).toBe(true);
  });
});

describe("planDecision", () => {
  it("internal approve on dual-stage → pending_client", () => {
    const p = planDecision(
      "required_internal_client",
      "internal",
      "approved",
      true,
    );
    expect(p.status).toBe("pending_client");
    expect(p.nextStage).toBe("client");
  });
  it("client approve with schedule → scheduled", () => {
    expect(
      planDecision("required_internal_client", "client", "approved", true)
        .status,
    ).toBe("scheduled");
  });
  it("changes requested → changes_requested, stays open", () => {
    const p = planDecision(
      "required_internal",
      "internal",
      "changes_requested",
      true,
    );
    expect(p.status).toBe("changes_requested");
    expect(p.closed).toBe(false);
  });
  it("reject → back to draft", () => {
    expect(
      planDecision("required_internal", "internal", "rejected", true).status,
    ).toBe("draft");
  });
});

describe("rbac", () => {
  it("client can only approve at the client stage", () => {
    const ctx = { role: "client" as const };
    expect(can(ctx, "approval:client")).toBe(true);
    expect(can(ctx, "post:create")).toBe(false);
    expect(can(ctx, "approval:internal")).toBe(false);
  });
  it("member override wins over role default", () => {
    const ctx = {
      role: "contributor" as const,
      permissionOverrides: { "post:publish": true },
    };
    expect(can(ctx, "post:publish")).toBe(true);
  });
  it("custom role uses its own permission map", () => {
    const ctx = {
      role: "custom" as const,
      customRolePermissions: { "inbox:reply": true },
    };
    expect(can(ctx, "inbox:reply")).toBe(true);
    expect(can(ctx, "post:create")).toBe(false);
  });
});
