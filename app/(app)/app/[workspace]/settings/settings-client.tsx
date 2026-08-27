"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createApiKey,
  createPortalLink,
  revokeApiKey,
  revokePortalLink,
  setApprovalMode,
} from "./actions";

const API_SCOPES = [
  "accounts:read",
  "posts:read",
  "posts:write",
  "analytics:read",
];

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

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

export function SettingsClient({
  workspaceSlug,
  approvalMode,
  appUrl,
  portalLinks,
  apiKeys,
}: {
  workspaceSlug: string;
  approvalMode: string;
  appUrl: string;
  portalLinks: PortalLink[];
  apiKeys: ApiKey[];
}) {
  const [mode, setMode] = useState(approvalMode);
  const [links, setLinks] = useState(portalLinks);
  const [keys, setKeys] = useState(apiKeys);
  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<string[]>([
    "accounts:read",
    "posts:write",
  ]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [pending, start] = useTransition();

  const addKey = () =>
    start(async () => {
      const res = await createApiKey(workspaceSlug, keyName, keyScopes);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setNewToken(res.token);
      await navigator.clipboard.writeText(res.token).catch(() => {});
      toast.success("API key created and copied");
      setKeyName("");
      setKeys((k) => [
        {
          id: crypto.randomUUID(),
          name: keyName || "API key",
          keyPrefix: res.prefix,
          scopes: keyScopes,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
        },
        ...k,
      ]);
    });

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

      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-[var(--text-tertiary)]">
            Workspace-scoped keys for the REST API (<code>/api/v1</code>) and
            the MCP endpoint (<code>/api/v1/mcp</code>).
          </p>

          {newToken && (
            <div className="rounded-[var(--radius-md)] border border-[var(--primary)]/40 bg-[var(--primary-soft)] p-3">
              <p className="text-xs font-medium text-[var(--primary-active)]">
                Copy this now — it won&apos;t be shown again
              </p>
              <code className="mt-1 block text-[13px] break-all">
                {newToken}
              </code>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key name (e.g. Zapier)"
            />
            <div className="flex flex-wrap gap-1.5">
              {API_SCOPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setKeyScopes((cur) =>
                      cur.includes(s)
                        ? cur.filter((x) => x !== s)
                        : [...cur, s],
                    )
                  }
                  className={
                    "rounded-full border px-2.5 py-0.5 text-[11px] " +
                    (keyScopes.includes(s)
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]"
                      : "border-[var(--border-strong)] text-[var(--text-secondary)]")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
            <Button onClick={addKey} disabled={pending} className="self-start">
              <KeyRound className="size-4" /> Create key
            </Button>
          </div>

          {keys.length > 0 && (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {k.name}{" "}
                      <code className="text-xs text-[var(--text-ghost)]">
                        {k.keyPrefix}…
                      </code>
                    </p>
                    <p className="flex flex-wrap gap-1 text-xs text-[var(--text-tertiary)]">
                      {k.scopes.map((s) => (
                        <Badge key={s} variant="outline">
                          {s}
                        </Badge>
                      ))}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Revoke key"
                    onClick={() =>
                      start(async () => {
                        await revokeApiKey(workspaceSlug, k.id);
                        setKeys((x) => x.filter((y) => y.id !== k.id));
                        toast.success("Key revoked");
                      })
                    }
                    className="shrink-0 text-[var(--text-ghost)] hover:text-[var(--error)]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
