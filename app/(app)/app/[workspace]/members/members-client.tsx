"use client";

import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Mail, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  initials,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  cancelInvite,
  changeRole,
  inviteMember,
  removeMember,
  type InviteState,
} from "./actions";

const ROLE_OPTIONS = ["manager", "editor", "contributor", "client", "viewer"];

type Member = {
  id: string;
  role: string;
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};
type Pending = { id: string; email: string; role: string; createdAt: string };

function InviteSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Mail className="size-4" /> Send invite
    </Button>
  );
}

export function MembersClient({
  workspaceSlug,
  currentUserId,
  canManage,
  members,
  pending,
}: {
  workspaceSlug: string;
  currentUserId: string;
  canManage: boolean;
  members: Member[];
  pending: Pending[];
}) {
  const [, start] = useTransition();
  const [state, formAction] = useActionState<InviteState, FormData>(
    inviteMember.bind(null, workspaceSlug),
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Invite someone</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={formAction}
              className="flex flex-wrap items-end gap-2"
            >
              <Input
                name="email"
                type="email"
                placeholder="teammate@company.com"
                required
                className="min-w-56 flex-1"
              />
              <select
                name="role"
                defaultValue="editor"
                className="h-10 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-0)] px-3 text-sm"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <InviteSubmit />
            </form>
            {state.error && (
              <p className="mt-2 text-sm text-[var(--error)]">{state.error}</p>
            )}
            {state.ok && (
              <p className="mt-2 text-sm text-[var(--success)]">{state.ok}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <ul>
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 border-b border-[var(--border)] p-4 last:border-0"
            >
              <Avatar className="size-9">
                {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
                <AvatarFallback>{initials(m.fullName, m.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.fullName ?? m.email.split("@")[0]}
                  {m.userId === currentUserId && (
                    <span className="ml-1.5 text-xs text-[var(--text-ghost)]">
                      you
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-[var(--text-tertiary)]">
                  {m.email}
                </p>
              </div>
              {canManage && m.role !== "owner" && m.userId !== currentUserId ? (
                <>
                  <select
                    defaultValue={m.role}
                    onChange={(e) =>
                      start(async () => {
                        await changeRole(workspaceSlug, m.id, e.target.value);
                        toast.success("Role updated");
                      })
                    }
                    className="h-8 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-0)] px-2 text-xs"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() =>
                      start(async () => {
                        await removeMember(workspaceSlug, m.id);
                        toast.success("Removed");
                      })
                    }
                    className="text-[var(--text-ghost)] hover:text-[var(--error)]"
                  >
                    <UserMinus className="size-4" />
                  </button>
                </>
              ) : (
                <Badge variant={m.role === "owner" ? "primary" : "neutral"}>
                  {m.role}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-[var(--border)]">
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{p.email}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {p.role}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Cancel invite"
                  onClick={() =>
                    start(async () => {
                      await cancelInvite(workspaceSlug, p.id);
                      toast.success("Invite cancelled");
                    })
                  }
                  className="text-[var(--text-ghost)] hover:text-[var(--error)]"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
