"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Clock, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addSlot,
  createQueue,
  deleteQueue,
  moveInQueue,
  queuePost,
  removeSlot,
  unqueuePost,
} from "./actions";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmtTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

type Queue = { id: string; name: string };
type Slot = {
  id: string;
  queueId: string | null;
  weekday: number;
  minuteOfDay: number;
};
type QPost = {
  id: string;
  caption: string;
  queueId: string;
  scheduledAt: string | null;
  status: string;
};

export function QueueClient({
  workspaceSlug,
  canManage,
  queues,
  slots,
  posts,
  drafts,
}: {
  workspaceSlug: string;
  canManage: boolean;
  queues: Queue[];
  slots: Slot[];
  posts: QPost[];
  drafts: { id: string; caption: string }[];
}) {
  const [, start] = useTransition();
  const [newQueue, setNewQueue] = useState("");

  if (queues.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <Clock className="size-8 text-[var(--text-tertiary)]" />
        <p className="text-sm text-[var(--text-tertiary)]">No queues yet.</p>
        {canManage && (
          <div className="flex gap-2">
            <Input
              value={newQueue}
              onChange={(e) => setNewQueue(e.target.value)}
              placeholder="e.g. Evergreen"
              className="w-48"
            />
            <Button
              onClick={() =>
                start(async () => {
                  const r = await createQueue(workspaceSlug, newQueue);
                  if (r.ok) {
                    setNewQueue("");
                    toast.success("Queue created");
                  } else toast.error(r.error);
                })
              }
            >
              <Plus className="size-4" /> Create
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <div className="flex gap-2">
          <Input
            value={newQueue}
            onChange={(e) => setNewQueue(e.target.value)}
            placeholder="New queue name"
            className="w-56"
          />
          <Button
            variant="secondary"
            onClick={() =>
              start(async () => {
                const r = await createQueue(workspaceSlug, newQueue);
                if (r.ok) {
                  setNewQueue("");
                  toast.success("Queue created");
                } else toast.error(r.error);
              })
            }
          >
            <Plus className="size-4" /> Add queue
          </Button>
        </div>
      )}

      {queues.map((q) => {
        const qSlots = slots
          .filter((s) => s.queueId === q.id)
          .sort(
            (a, b) => a.weekday - b.weekday || a.minuteOfDay - b.minuteOfDay,
          );
        const qPosts = posts
          .filter((p) => p.queueId === q.id)
          .sort((a, b) =>
            (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""),
          );

        return (
          <Card key={q.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{q.name}</CardTitle>
              {canManage && (
                <button
                  aria-label="Delete queue"
                  onClick={() =>
                    start(async () => {
                      await deleteQueue(workspaceSlug, q.id);
                      toast.success("Queue deleted");
                    })
                  }
                  className="text-[var(--text-ghost)] hover:text-[var(--error)]"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* slots */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">
                  Posting slots
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {qSlots.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs"
                    >
                      {DAYS[s.weekday]} {fmtTime(s.minuteOfDay)}
                      {canManage && (
                        <button
                          onClick={() =>
                            start(() => removeSlot(workspaceSlug, q.id, s.id))
                          }
                          className="text-[var(--text-ghost)] hover:text-[var(--error)]"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {qSlots.length === 0 && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                      No slots — add one so posts can schedule.
                    </span>
                  )}
                </div>
                {canManage && (
                  <SlotAdder workspaceSlug={workspaceSlug} queueId={q.id} />
                )}
              </div>

              {/* queued posts */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">
                  In this queue ({qPosts.length})
                </p>
                <ul className="flex flex-col divide-y divide-[var(--border)]">
                  {qPosts.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-2 py-2">
                      <span className="w-28 shrink-0 text-xs text-[var(--text-tertiary)] tabular-nums">
                        {p.scheduledAt
                          ? new Date(p.scheduledAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "unscheduled"}
                      </span>
                      <a
                        href={`/app/${workspaceSlug}/composer?post=${p.id}`}
                        className="min-w-0 flex-1 truncate text-sm hover:underline"
                      >
                        {p.caption || "(no caption)"}
                      </a>
                      <Badge
                        variant={
                          p.status === "scheduled" ? "primary" : "neutral"
                        }
                      >
                        {p.status}
                      </Badge>
                      {canManage && (
                        <span className="flex shrink-0">
                          <button
                            disabled={i === 0}
                            onClick={() =>
                              start(() =>
                                moveInQueue(
                                  workspaceSlug,
                                  q.id,
                                  p.id,
                                  qPosts[i - 1].id,
                                ),
                              )
                            }
                            className="p-1 text-[var(--text-ghost)] hover:text-[var(--text-primary)] disabled:opacity-30"
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button
                            disabled={i === qPosts.length - 1}
                            onClick={() =>
                              start(() =>
                                moveInQueue(
                                  workspaceSlug,
                                  q.id,
                                  p.id,
                                  qPosts[i + 1].id,
                                ),
                              )
                            }
                            className="p-1 text-[var(--text-ghost)] hover:text-[var(--text-primary)] disabled:opacity-30"
                          >
                            <ArrowDown className="size-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              start(() =>
                                unqueuePost(workspaceSlug, q.id, p.id),
                              )
                            }
                            className="p-1 text-[var(--text-ghost)] hover:text-[var(--error)]"
                          >
                            <X className="size-3.5" />
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                  {qPosts.length === 0 && (
                    <li className="py-2 text-xs text-[var(--text-tertiary)]">
                      Nothing queued.
                    </li>
                  )}
                </ul>

                {canManage && drafts.length > 0 && (
                  <div className="mt-2">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const id = e.target.value;
                        e.target.value = "";
                        start(async () => {
                          await queuePost(workspaceSlug, q.id, id);
                          toast.success("Added to queue");
                        });
                      }}
                      className="h-9 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-0)] px-2 text-sm"
                    >
                      <option value="">＋ Add a draft…</option>
                      {drafts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {(d.caption || "(no caption)").slice(0, 60)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SlotAdder({
  workspaceSlug,
  queueId,
}: {
  workspaceSlug: string;
  queueId: string;
}) {
  const [, start] = useTransition();
  const [weekday, setWeekday] = useState(1);
  const [time, setTime] = useState("09:00");

  return (
    <div className="mt-2 flex items-center gap-2">
      <select
        value={weekday}
        onChange={(e) => setWeekday(Number(e.target.value))}
        className="h-8 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-0)] px-2 text-xs"
      >
        {DAYS.map((d, i) => (
          <option key={i} value={i}>
            {d}
          </option>
        ))}
      </select>
      <Input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="h-8 w-28"
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          const [h, m] = time.split(":").map(Number);
          start(async () => {
            const r = await addSlot(workspaceSlug, queueId, {
              weekday,
              hour: h,
              minute: m,
            });
            if (!r?.ok) toast.error(r?.error ?? "Failed");
          });
        }}
      >
        <Plus className="size-3.5" /> Slot
      </Button>
    </div>
  );
}
