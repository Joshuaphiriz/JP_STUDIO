"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, Check, ExternalLink, Send, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import {
  addInboxNote,
  assignMessage,
  replyToMessage,
  setMessageStatus,
} from "./actions";

type Message = {
  id: string;
  type: string;
  platform: string;
  body: string;
  authorName: string | null;
  authorHandle: string | null;
  permalink: string | null;
  status: string;
  sentiment: string | null;
  assigneeUserId: string | null;
  platformCreatedAt: string;
  accountName: string;
};
type Member = { userId: string; name: string | null; email: string };
type Reply = { id: string; body: string; createdAt: string };
type Note = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
};
type Saved = { id: string; title: string; body: string };

export function InboxClient({
  workspaceSlug,
  currentUserId,
  canReply,
  statusFilter,
  messages,
  selectedId,
  members,
  replies,
  notes,
  savedReplies,
}: {
  workspaceSlug: string;
  currentUserId: string;
  canReply: boolean;
  statusFilter: string;
  messages: Message[];
  selectedId: string | null;
  members: Member[];
  replies: Reply[];
  notes: Note[];
  savedReplies: Saved[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [pending, start] = useTransition();

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  const nav = (patch: Record<string, string>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) q.set(k, v);
    router.push(`/app/${workspaceSlug}/inbox?${q.toString()}`);
  };

  const send = () =>
    start(async () => {
      if (!selected) return;
      const res = await replyToMessage(workspaceSlug, selected.id, reply);
      if (res.ok) {
        toast.success("Reply sent");
        setReply("");
      } else toast.error(res.error ?? "Failed");
    });

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
      <div className="flex flex-col gap-3">
        <Segmented
          value={statusFilter}
          onValueChange={(v) => nav({ status: v })}
        >
          <SegmentedItem value="open">Open</SegmentedItem>
          <SegmentedItem value="resolved">Resolved</SegmentedItem>
          <SegmentedItem value="all">All</SegmentedItem>
        </Segmented>
        <Card className="max-h-[70dvh] divide-y divide-[var(--border)] overflow-y-auto p-0">
          {messages.map((m) => (
            <button
              key={m.id}
              onClick={() => nav({ m: m.id })}
              className={cn(
                "flex w-full flex-col gap-1 p-3 text-left",
                m.id === selectedId
                  ? "bg-[var(--primary-soft)]"
                  : "hover:bg-[var(--surface-1)]",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium">
                  {m.authorName ?? m.authorHandle ?? "Someone"}
                </span>
                {m.status === "unread" && (
                  <span className="size-1.5 rounded-full bg-[var(--primary)]" />
                )}
                <span className="ml-auto text-[10px] text-[var(--text-ghost)]">
                  {new Date(m.platformCreatedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-[var(--text-tertiary)]">
                {m.body}
              </p>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline">{m.platform}</Badge>
                <Badge variant="neutral">{m.type}</Badge>
                {m.sentiment === "negative" && (
                  <Badge variant="error">negative</Badge>
                )}
                {m.sentiment === "positive" && (
                  <Badge variant="success">positive</Badge>
                )}
              </div>
            </button>
          ))}
        </Card>
      </div>

      {selected ? (
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                {selected.authorName ?? selected.authorHandle ?? "Someone"}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {selected.accountName} · {selected.platform} · {selected.type} ·{" "}
                {new Date(selected.platformCreatedAt).toLocaleString()}
              </p>
            </div>
            {selected.permalink && (
              <a
                href={selected.permalink}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--text-tertiary)] hover:text-[var(--primary)]"
              >
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>

          <p className="rounded-[var(--radius-md)] bg-[var(--surface-1)] p-3 text-sm whitespace-pre-wrap">
            {selected.body}
          </p>

          {replies.map((r) => (
            <div
              key={r.id}
              className="ml-6 rounded-[var(--radius-md)] border border-[var(--primary)]/30 bg-[var(--primary-soft)] p-3 text-sm"
            >
              <p className="mb-1 text-[11px] text-[var(--text-tertiary)]">
                Your reply · {new Date(r.createdAt).toLocaleString()}
              </p>
              {r.body}
            </div>
          ))}

          {notes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {notes.map((n) => (
                <p
                  key={n.id}
                  className="rounded-[var(--radius-sm)] bg-[var(--warning)]/10 px-2.5 py-1.5 text-xs text-[var(--text-secondary)]"
                >
                  <StickyNote className="mr-1 inline size-3" />
                  {n.body}
                  <span className="text-[var(--text-ghost)]">
                    {" "}
                    — {n.authorName ?? "team"}
                  </span>
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selected.assigneeUserId ?? ""}
              onChange={(e) =>
                start(async () => {
                  await assignMessage(
                    workspaceSlug,
                    selected.id,
                    e.target.value || null,
                  );
                  toast.success("Assignment updated");
                })
              }
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-0)] px-2 text-xs"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name ?? m.email}
                  {m.userId === currentUserId ? " (you)" : ""}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                start(async () => {
                  await setMessageStatus(
                    workspaceSlug,
                    selected.id,
                    "resolved",
                  );
                  toast.success("Resolved");
                })
              }
            >
              <Check className="size-4" /> Resolve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                start(async () => {
                  await setMessageStatus(
                    workspaceSlug,
                    selected.id,
                    "archived",
                  );
                  toast.success("Archived");
                })
              }
            >
              <Archive className="size-4" /> Archive
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowNote((s) => !s)}
            >
              <StickyNote className="size-4" /> Note
            </Button>
          </div>

          {showNote && (
            <div className="flex gap-2">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Internal note (never posted publicly)"
                className="min-h-14 text-[13px]"
              />
              <Button
                size="sm"
                onClick={() =>
                  start(async () => {
                    await addInboxNote(workspaceSlug, selected.id, note);
                    setNote("");
                    setShowNote(false);
                    toast.success("Note added");
                  })
                }
              >
                Add
              </Button>
            </div>
          )}

          {canReply && (
            <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
              {savedReplies.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {savedReplies.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setReply(s.body)}
                      className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:border-[var(--primary)]"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={`Reply on ${selected.platform}…`}
                className="min-h-20"
              />
              <div className="flex justify-end">
                <Button onClick={send} disabled={pending || !reply.trim()}>
                  <Send className="size-4" /> Send reply
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="flex items-center justify-center p-12 text-sm text-[var(--text-tertiary)]">
          Select a message
        </Card>
      )}
    </div>
  );
}
