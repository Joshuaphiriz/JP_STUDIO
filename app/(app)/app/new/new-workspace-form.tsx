"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createWorkspace, type NewWorkspaceState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type Org = { id: string; name: string; slug: string; role: string };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Spinner />} Create workspace
    </Button>
  );
}

export function NewWorkspaceForm({ organizations }: { organizations: Org[] }) {
  const [state, action] = useActionState<NewWorkspaceState, FormData>(
    createWorkspace,
    {},
  );
  const [orgId, setOrgId] = useState<string>(organizations[0]?.id ?? "__new__");

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspaceName">Workspace name</Label>
            <Input
              id="workspaceName"
              name="workspaceName"
              placeholder="Acme Coffee"
              required
              autoFocus
            />
          </div>

          {organizations.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="organizationId">Organization</Label>
              <select
                id="organizationId"
                name="organizationId"
                value={orgId === "__new__" ? "" : orgId}
                onChange={(e) => setOrgId(e.target.value || "__new__")}
                className="h-10 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-0)] px-3 text-sm outline-none focus-visible:border-[var(--primary)] focus-visible:ring-4 focus-visible:ring-[var(--primary-ring)]"
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
                <option value="">+ New organization</option>
              </select>
            </div>
          )}

          {orgId === "__new__" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="organizationName">Organization name</Label>
              <Input
                id="organizationName"
                name="organizationName"
                placeholder="Acme Agency"
              />
              <p className="text-xs text-[var(--text-ghost)]">
                Leave blank to reuse the workspace name.
              </p>
            </div>
          )}

          {state.error && (
            <p className="text-sm text-[var(--error)]">{state.error}</p>
          )}
          <Submit />
        </form>
      </CardContent>
    </Card>
  );
}
