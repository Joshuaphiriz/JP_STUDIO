import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageContainer } from "@/components/shell/page-header";
import { getMyOrganizations } from "@/lib/dal";
import { NewWorkspaceForm } from "./new-workspace-form";

export const metadata = { title: "New workspace" };

export default async function NewWorkspacePage() {
  const orgs = await getMyOrganizations();
  const ownable = orgs.filter((o) => o.role !== "member");

  return (
    <PageContainer className="max-w-md">
      <Link
        href="/app"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
      >
        <ChevronLeft className="size-4" /> Back
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New workspace</h1>
      <p className="mt-1 text-sm text-[var(--text-tertiary)]">
        One workspace per brand or client.
      </p>
      <div className="mt-6">
        <NewWorkspaceForm organizations={ownable} />
      </div>
    </PageContainer>
  );
}
