"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronDown,
  ImagePlus,
  Loader2,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { capabilitiesFor } from "@/lib/platforms/capabilities";
import type { ComposerInput } from "@/lib/composer/schema";
import type { Platform } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import {
  publishNow,
  saveDraft,
  schedulePost,
} from "@/app/(app)/app/[workspace]/composer/actions";
import { PlatformPreview } from "./platform-preview";

type Account = {
  id: string;
  platform: Platform;
  displayName: string;
  avatarUrl: string | null;
};
type Asset = {
  id: string;
  url: string;
  kind: "image" | "video";
  fileName: string;
};

type InitialPost = {
  id: string;
  caption: string;
  firstComment: string | null;
  mediaIds: string[];
  scheduledAt: string | null;
  accountIds: string[];
  overrides: { socialAccountId: string; captionOverride: string | null }[];
} | null;

export function ComposerClient({
  workspaceSlug,
  accounts,
  initialPost,
  initialAssets,
}: {
  workspaceSlug: string;
  accounts: Account[];
  initialPost: InitialPost;
  initialAssets: Asset[];
}) {
  const router = useRouter();
  const ctx = useMemo(() => ({ workspaceSlug }), [workspaceSlug]);

  const [postId, setPostId] = useState<string | undefined>(initialPost?.id);
  const [caption, setCaption] = useState(initialPost?.caption ?? "");
  const [firstComment, setFirstComment] = useState(
    initialPost?.firstComment ?? "",
  );
  const [selected, setSelected] = useState<string[]>(
    initialPost?.accountIds ?? [],
  );
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [overrides, setOverrides] = useState<Record<string, string>>(
    Object.fromEntries(
      (initialPost?.overrides ?? [])
        .filter((o) => o.captionOverride != null)
        .map((o) => [o.socialAccountId, o.captionOverride as string]),
    ),
  );
  const [scheduledAt, setScheduledAt] = useState(
    initialPost?.scheduledAt ?? "",
  );
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<null | "draft" | "schedule" | "publish">(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedAccounts = accounts.filter((a) => selected.includes(a.id));
  const selectedPlatforms = [
    ...new Set(selectedAccounts.map((a) => a.platform)),
  ];
  const minCaptionMax = selectedPlatforms.length
    ? Math.min(...selectedPlatforms.map((p) => capabilitiesFor(p).captionMax))
    : 5000;

  const buildInput = useCallback(
    (): ComposerInput => ({
      postId,
      caption,
      mediaIds: assets.map((a) => a.id),
      firstComment: firstComment || null,
      tags: [],
      accountIds: selected,
      overrides: Object.entries(overrides).map(([socialAccountId, v]) => ({
        socialAccountId,
        captionOverride: v || null,
      })),
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    }),
    [postId, caption, assets, firstComment, selected, overrides, scheduledAt],
  );

  // autosave draft every 30s once there's content
  useEffect(() => {
    if (!caption && assets.length === 0) return;
    const t = setInterval(async () => {
      const res = await saveDraft(ctx, buildInput());
      if (res.ok) setPostId(res.postId);
    }, 30_000);
    return () => clearInterval(t);
  }, [ctx, buildInput, caption, assets.length]);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("workspace", workspaceSlug);
        fd.set("file", file);
        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Upload failed");
          continue;
        }
        setAssets((a) => [...a, json.asset]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function run(intent: "draft" | "schedule" | "publish") {
    setBusy(intent);
    try {
      const fn =
        intent === "draft"
          ? saveDraft
          : intent === "schedule"
            ? schedulePost
            : publishNow;
      const res = await fn(ctx, buildInput());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPostId(res.postId);
      if (intent === "draft") toast.success("Draft saved");
      else if (intent === "schedule") {
        toast.success("Scheduled");
        router.push(`/app/${workspaceSlug}/calendar`);
      } else {
        toast[res.status === "published" ? "success" : "message"](
          res.status === "published"
            ? "Published"
            : res.status === "partially_failed"
              ? "Published to some accounts — check Accounts for errors"
              : res.status === "failed"
                ? "Publishing failed"
                : "Publishing…",
        );
        if (res.status === "published") router.push(`/app/${workspaceSlug}`);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        {/* accounts */}
        <Card className="p-4">
          <Label>Post to</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {accounts.length === 0 && (
              <p className="text-sm text-[var(--text-tertiary)]">
                No connected accounts.{" "}
                <a
                  href={`/app/${workspaceSlug}/accounts`}
                  className="text-[var(--primary)] underline"
                >
                  Connect one
                </a>
                .
              </p>
            )}
            {accounts.map((a) => {
              const on = selected.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() =>
                    setSelected((s) =>
                      on ? s.filter((x) => x !== a.id) : [...s, a.id],
                    )
                  }
                  className={cn(
                    "press flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px]",
                    on
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]"
                      : "border-[var(--border-strong)] text-[var(--text-secondary)]",
                  )}
                >
                  {a.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.avatarUrl}
                      alt=""
                      className="size-4 rounded-full"
                    />
                  ) : null}
                  {a.displayName}
                  <span className="text-[var(--text-ghost)]">{a.platform}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* caption */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="caption">Caption</Label>
            <span
              className={cn(
                "text-xs tabular-nums",
                caption.length > minCaptionMax
                  ? "text-[var(--error)]"
                  : "text-[var(--text-ghost)]",
              )}
            >
              {caption.length}/{minCaptionMax}
            </span>
          </div>
          <Textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What do you want to share?"
            className="mt-2 min-h-32"
          />
          {selectedPlatforms.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--text-tertiary)]">
              {selectedPlatforms.map((p) => (
                <span key={p}>
                  {p}: {caption.length}/{capabilitiesFor(p).captionMax}
                </span>
              ))}
            </div>
          )}

          {/* media */}
          <div className="mt-3 flex flex-wrap gap-2">
            {assets.map((a) => (
              <div
                key={a.id}
                className="group relative size-20 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]"
              >
                {a.kind === "video" ? (
                  <video src={a.url} className="size-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt="" className="size-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setAssets((s) => s.filter((x) => x.id !== a.id))
                  }
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="press flex size-20 flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-strong)] text-[var(--text-tertiary)]"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              <span className="text-[10px]">Add</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => onUpload(e.target.files)}
            />
          </div>
        </Card>

        {/* per-platform overrides */}
        {selectedAccounts.length > 0 && (
          <Card className="p-4">
            <Label>Customize per account</Label>
            <div className="mt-2 flex flex-col divide-y divide-[var(--border)]">
              {selectedAccounts.map((a) => (
                <OverrideRow
                  key={a.id}
                  account={a}
                  base={caption}
                  value={overrides[a.id]}
                  onChange={(v) =>
                    setOverrides((o) => {
                      const next = { ...o };
                      if (v == null) delete next[a.id];
                      else next[a.id] = v;
                      return next;
                    })
                  }
                />
              ))}
            </div>
          </Card>
        )}

        {/* first comment */}
        <Card className="p-4">
          <Label htmlFor="fc">First comment (optional)</Label>
          <Textarea
            id="fc"
            value={firstComment}
            onChange={(e) => setFirstComment(e.target.value)}
            placeholder="Posted right after — good for links and hashtags"
            className="mt-2 min-h-16"
          />
        </Card>

        {/* action bar */}
        <div className="sticky bottom-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-0)]/90 p-3 shadow-lg backdrop-blur">
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="h-9 w-auto"
          />
          <Button
            variant="secondary"
            onClick={() => run("draft")}
            disabled={busy !== null}
          >
            {busy === "draft" && <Loader2 className="size-4 animate-spin" />}{" "}
            Save draft
          </Button>
          <Button
            variant="outline"
            onClick={() => run("schedule")}
            disabled={busy !== null || !scheduledAt}
          >
            <CalendarClock className="size-4" /> Schedule
          </Button>
          <Button onClick={() => run("publish")} disabled={busy !== null}>
            {busy === "publish" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Publish now
          </Button>
        </div>
      </div>

      {/* previews */}
      <div className="lg:sticky lg:top-6 lg:h-fit">
        <p className="mb-2 text-xs font-medium tracking-wide text-[var(--text-ghost)] uppercase">
          Preview
        </p>
        <div className="flex flex-col gap-3">
          {selectedAccounts.length === 0 && (
            <p className="text-sm text-[var(--text-tertiary)]">
              Select an account to preview.
            </p>
          )}
          {selectedAccounts.map((a) => (
            <PlatformPreview
              key={a.id}
              platform={a.platform}
              accountName={a.displayName}
              avatarUrl={a.avatarUrl}
              caption={overrides[a.id] ?? caption}
              mediaUrls={assets.map((m) => ({ url: m.url, kind: m.kind }))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OverrideRow({
  account,
  base,
  value,
  onChange,
}: {
  account: { id: string; displayName: string; platform: string };
  base: string;
  value: string | undefined;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(value != null);
  return (
    <div className="py-2">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (!next) onChange(null);
          else onChange(value ?? base);
        }}
        className="flex w-full items-center gap-2 text-sm"
      >
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
        {account.displayName}
        <span className="text-xs text-[var(--text-ghost)]">
          {account.platform}
        </span>
        {value != null && (
          <span className="ml-auto text-[11px] text-[var(--primary)]">
            overridden
          </span>
        )}
      </button>
      {open && (
        <div className="mt-2 flex items-start gap-2">
          <Textarea
            value={value ?? base}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-20 text-[13px]"
          />
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Clear override"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
