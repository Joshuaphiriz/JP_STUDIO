"use client";

import { Bell, Check, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

/** Live sample surface — inherits the same CSS vars the editor is mutating. */
export function ThemePreview() {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-sm font-semibold text-[var(--brand-fg)]">
            JP
          </span>
          <div>
            <p className="text-sm font-semibold">Acme Coffee</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              3 posts scheduled
            </p>
          </div>
        </div>
        <Button size="icon-sm" variant="ghost">
          <Bell className="size-4" />
        </Button>
      </div>

      <div className="inset-group">
        <div className="flex items-center justify-between p-3.5">
          <span className="text-sm">Auto-publish approved posts</span>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between p-3.5">
          <span className="text-sm">Notify client on submit</span>
          <Switch />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Input placeholder="Search posts…" />
        <div className="flex flex-wrap gap-2">
          <Badge variant="primary">
            <Hash className="size-3" /> launch
          </Badge>
          <Badge variant="success">
            <Check className="size-3" /> approved
          </Badge>
          <Badge variant="warning">pending</Badge>
          <Badge variant="outline">draft</Badge>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm">Schedule</Button>
        <Button size="sm" variant="secondary">
          Save draft
        </Button>
        <Button size="sm" variant="ghost">
          Discard
        </Button>
      </div>

      <p className="font-display text-lg">The quick brown fox jumps.</p>
    </div>
  );
}
