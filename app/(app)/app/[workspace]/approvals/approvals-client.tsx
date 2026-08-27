"use client";

import { useState, useTransition } from "react";
import { Check, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { decide } from "./actions";

type Item = {
  id: string;
  caption: string;
  status: string;
  stage: "internal" | "client";
  scheduledAt: string | null;
  updatedAt: string;
  authorName: string | null;
  authorEmail: string | null;
  targets: string[];
};

export function ApprovalsClient({
  workspaceSlug,
  items,
}: {
  workspaceSlug: string;
  items: Item[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => (
        <Row key={it.id} workspaceSlug={workspaceSlug} item={it} />
      ))}
    </div>
  );
}

function Row({ workspaceSlug, item }: { workspaceSlug: string; item: Item }) {
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [pending, start] = useTransition();

  const act = (decision: "approved" | "changes_requested" | "rejected") =>
    start(async () => {
      const res = await decide(
        workspaceSlug,
        item.id,
        item.stage,
        decision,
        comment,
      );
      if (res.ok) {
        toast.success(
          decision === "approved"
            ? "Approved"
            : decision === "rejected"
              ? "Rejected"
              : "Changes requested",
        );
      } else {
        toast.error(res.error ?? "Failed");
      }
    });

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm text-[var(--text-primary)]">
            {item.caption || "(no caption)"}
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {item.authorName ?? item.authorEmail ?? "Unknown"} ·{" "}
            {item.targets.join(", ") || "no targets"}
            {item.scheduledAt &&
              ` · for ${new Date(item.scheduledAt).toLocaleString()}`}
          </p>
        </div>
        <Badge variant={item.stage === "client" ? "primary" : "warning"}>
          {item.status.replace("_", " ")}
        </Badge>
      </div>

      {(showComment || item.status === "changes_requested") && (
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment (required to reject or request changes)"
          className="min-h-16 text-[13px]"
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => act("approved")} disabled={pending}>
          <Check className="size-4" /> Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (!showComment) return setShowComment(true);
            act("changes_requested");
          }}
          disabled={pending}
        >
          <MessageSquare className="size-4" /> Request changes
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (!showComment) return setShowComment(true);
            act("rejected");
          }}
          disabled={pending}
        >
          <X className="size-4" /> Reject
        </Button>
        <a
          href={`/app/${workspaceSlug}/composer?post=${item.id}`}
          className="ml-auto self-center text-xs text-[var(--primary)] hover:underline"
        >
          Open in composer
        </a>
      </div>
    </Card>
  );
}
