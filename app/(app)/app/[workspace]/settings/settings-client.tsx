"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPortalLink, revokePortalLink, setApprovalMode } from "./actions";

const MODES: { value: string; title: string; desc: string }[] = [
  { value: "none", title: "No approval", desc: "Posts publish straight away." },
  {
    value: "optional",
    title: "Optional",
    desc: "Authors choose to publish or send for review.",
  },
  {
    value: "required_internal",
    title: "Internal review",
    desc: "A manager approves every post before it schedules.",
  },
  {
    value: "required_internal_client",
    title: "Internal + client",
    desc: "Manager approves, then the client approves via the portal.",
  },
];

type PortalLink = {
  id: string;
  label: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
};

export function SettingsClient({
  workspaceSlug,
  approvalMode,
  appUrl,
  portalLinks,
}: {
  workspaceSlug: string;
  approvalMode: string;
  appUrl: string;
  portalLinks: PortalLink[];
}) {
  const [mode, setMode] = useState(approvalMode);
  const [links, setLinks] = useState(portalLinks);
  const [label, setLabel] = useState("");
  const [pending, start] = useTransition();

  const changeMode = (next: string) => {
    setMode(next);
    start(async () => {
      const res = await setApprovalMode(workspaceSlug, next);
      if (res.ok) toast.success("Approval workflow updated");
      else {
        toast.error(res.error ?? "Failed");
        setMode(approvalMode);
      }
    });
  };

  const addLink = () =>
    start(async () => {
      const res = await createPortalLink(workspaceSlug, label, appUrl);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await navigator.clipboard.writeText(res.url).catch(() => {});
      toast.success("Portal link created and copied");
      setLabel("");
      setLinks((l) => [
        {
          id: crypto.randomUUID(),
          label: res.label,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
          lastUsedAt: null,
        },
        ...l,
      ]);
    });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Approval workflow</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => changeMode(m.value)}
              disabled={pending}
              className={
                "press flex items-start gap-3 rounded-[var(--radius-md)] border p-3 text-left " +
                (mode === m.value
                  ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]")
              }
            >
              <span
                className={
                  "mt-0.5 size-4 shrink-0 rounded-full border-2 " +
                  (mode === m.value
                    ? "border-[var(--primary)] bg-[var(--primary)]"
                    : "border-[var(--border-strong)]")
                }
              />
              <span>
                <span className="block text-sm font-medium">{m.title}</span>
                <span className="block text-xs text-[var(--text-tertiary)]">
                  {m.desc}
                </span>
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client portal links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-[var(--text-tertiary)]">
            A passwordless link that lets a client review and approve posts —
            they never see the rest of the workspace. Expires in 30 days.
          </p>
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Acme Coffee — Jordan"
              />
            </div>
            <Button onClick={addLink} disabled={pending}>
              <Link2 className="size-4" /> Create link
            </Button>
          </div>

          {links.length > 0 && (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {links.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.label}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {l.lastUsedAt
                        ? `Last used ${new Date(l.lastUsedAt).toLocaleDateString()}`
                        : "Never used"}{" "}
                      · expires {new Date(l.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Revoke"
                    onClick={() =>
                      start(async () => {
                        await revokePortalLink(workspaceSlug, l.id);
                        setLinks((x) => x.filter((y) => y.id !== l.id));
                        toast.success("Revoked");
                      })
                    }
                    className="text-[var(--text-ghost)] hover:text-[var(--error)]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-[var(--text-ghost)]">
            <Copy className="mr-1 inline size-3" />
            The full link is shown and copied only once, when you create it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
