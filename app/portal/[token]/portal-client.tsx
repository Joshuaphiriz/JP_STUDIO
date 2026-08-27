"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { portalDecide } from "./actions";

type Item = {
  id: string;
  caption: string;
  scheduledAt: string | null;
  targets: string[];
  media: { url: string; kind: string }[];
};

export function PortalClient({
  token,
  items,
}: {
  token: string;
  items: Item[];
}) {
  const [list, setList] = useState(items);

  return (
    <div className="flex flex-col gap-4">
      {list.map((it) => (
        <Row
          key={it.id}
          token={token}
          item={it}
          onDone={() => setList((l) => l.filter((x) => x.id !== it.id))}
        />
      ))}
    </div>
  );
}

function Row({
  token,
  item,
  onDone,
}: {
  token: string;
  item: Item;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [pending, start] = useTransition();

  const act = (decision: "approved" | "changes_requested") =>
    start(async () => {
      const res = await portalDecide(token, item.id, decision, note);
      if (res.ok) {
        toast.success(decision === "approved" ? "Approved" : "Sent back");
        onDone();
      } else {
        toast.error(res.error ?? "Something went wrong");
      }
    });

  return (
    <Card className="overflow-hidden">
      {item.media.length > 0 && (
        <div className="grid grid-cols-2 gap-0.5 bg-[var(--border)]">
          {item.media.slice(0, 4).map((m, i) =>
            m.kind === "video" ? (
              <video
                key={i}
                src={m.url}
                className="aspect-square w-full object-cover"
                muted
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={m.url}
                alt=""
                className="aspect-square w-full object-cover"
              />
            ),
          )}
        </div>
      )}
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm whitespace-pre-wrap">
          {item.caption || "(no caption)"}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {item.targets.join(", ")}
          {item.scheduledAt &&
            ` · scheduled ${new Date(item.scheduledAt).toLocaleString()}`}
        </p>
        {showNote && (
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What needs to change?"
            className="min-h-16 text-[13px]"
          />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => act("approved")} disabled={pending}>
            <Check className="size-4" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!showNote) return setShowNote(true);
              act("changes_requested");
            }}
            disabled={pending}
          >
            <X className="size-4" /> Request changes
          </Button>
        </div>
      </div>
    </Card>
  );
}
