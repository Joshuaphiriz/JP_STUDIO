"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Link2, Loader2, Plus, Send, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PlatformInfo } from "@/lib/platforms/catalog";
import {
  connectTelegramAction,
  disconnectAccountAction,
  type TelegramConnectState,
} from "./actions";

type ConnectedAccount = {
  id: string;
  platform: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  status: string;
  followerCount: number | null;
};

export function AccountsClient({
  workspaceSlug,
  connected,
  platforms,
  notice,
}: {
  workspaceSlug: string;
  connected: ConnectedAccount[];
  platforms: (PlatformInfo & { configured: boolean })[];
  notice: { kind: "success" | "error"; text: string } | null;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <div
          className={
            "rounded-[var(--radius-md)] border px-3.5 py-2.5 text-sm " +
            (notice.kind === "success"
              ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
              : "border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)]")
          }
        >
          {notice.text}
        </div>
      )}

      {connected.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
            Connected
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {connected.map((a) => (
              <Card key={a.id} className="flex items-center gap-3 p-4">
                {a.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.avatarUrl}
                    alt=""
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold uppercase">
                    {a.platform.slice(0, 2)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {a.displayName}
                  </p>
                  <p className="truncate text-xs text-[var(--text-tertiary)]">
                    {a.handle ?? a.platform}
                    {a.followerCount != null &&
                      ` · ${a.followerCount.toLocaleString()} followers`}
                  </p>
                </div>
                <Badge
                  variant={a.status === "connected" ? "success" : "warning"}
                >
                  {a.status}
                </Badge>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Disconnect"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await disconnectAccountAction(workspaceSlug, a.id);
                      toast.success("Disconnected");
                    })
                  }
                >
                  <Unplug className="size-4" />
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
          Add an account
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {platforms.map((p) => (
            <Card key={p.key} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                    {p.blurb}
                  </p>
                </div>
                {p.needsReview ? (
                  <Badge variant="outline">app review</Badge>
                ) : (
                  <Badge variant="success">no review</Badge>
                )}
              </div>

              {p.key === "telegram" ? (
                <TelegramConnect workspaceSlug={workspaceSlug} />
              ) : p.configured ? (
                <Button
                  size="sm"
                  variant="secondary"
                  asChild
                  className="self-start"
                >
                  <a
                    href={`/api/oauth/${p.key}/start?workspace=${workspaceSlug}`}
                  >
                    <Link2 className="size-4" /> Connect
                  </a>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled
                  className="self-start"
                >
                  Needs API keys
                </Button>
              )}
            </Card>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--text-ghost)]">
          OAuth platforms need your own registered developer app. Add its
          credentials as environment variables and the Connect button activates.
        </p>
      </section>
    </div>
  );
}

function TelegramSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Send className="size-4" />
      )}
      Connect channel
    </Button>
  );
}

function TelegramConnect({ workspaceSlug }: { workspaceSlug: string }) {
  const [open, setOpen] = useState(false);
  const action = connectTelegramAction.bind(null, workspaceSlug);
  const [state, formAction] = useActionState<TelegramConnectState, FormData>(
    action,
    {},
  );

  if (state.ok && open) {
    toast.success(state.ok);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="self-start">
          <Plus className="size-4" /> Connect
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a Telegram channel</DialogTitle>
          <DialogDescription>
            Create a bot with @BotFather, add it as an administrator of your
            channel, then paste its token and the channel username below.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="botToken">Bot token</Label>
            <Input
              id="botToken"
              name="botToken"
              placeholder="123456:ABC-DEF..."
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channel">Channel</Label>
            <Input
              id="channel"
              name="channel"
              placeholder="@mychannel"
              required
            />
          </div>
          {state.error && (
            <p className="text-sm text-[var(--error)]">{state.error}</p>
          )}
          <div className="flex items-center gap-2">
            <TelegramSubmit />
            {state.ok && (
              <span className="inline-flex items-center gap-1 text-sm text-[var(--success)]">
                <CheckCircle2 className="size-4" /> {state.ok}
              </span>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
