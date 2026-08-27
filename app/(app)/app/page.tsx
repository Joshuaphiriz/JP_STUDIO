import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMyWorkspaces } from "@/lib/dal";
import { getLastWorkspaceSlug } from "@/lib/workspace-prefs";

export const metadata = { title: "Workspaces" };

export default async function AppHome() {
  const workspaces = await getMyWorkspaces();

  if (workspaces.length === 0) {
    return (
      <PageContainer className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
        <Reveal>
          <span className="mx-auto flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)]">
            <Sparkles className="size-7 text-[var(--primary)]" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Let&apos;s set up your first workspace
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-tertiary)]">
            A workspace holds one brand or client — its accounts, content,
            calendar, and inbox, kept separate from everything else.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/app/new">
              <Plus /> Create workspace
            </Link>
          </Button>
        </Reveal>
      </PageContainer>
    );
  }

  const last = await getLastWorkspaceSlug();
  if (last && workspaces.some((w) => w.slug === last)) {
    redirect(`/app/${last}`);
  }
  if (workspaces.length === 1) {
    redirect(`/app/${workspaces[0].slug}`);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Workspaces"
        description="Pick up where you left off."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/new">
              <Plus /> New
            </Link>
          </Button>
        }
      />
      <Stagger className="grid gap-3 sm:grid-cols-2">
        {workspaces.map((w) => (
          <StaggerItem key={w.id}>
            <Link href={`/app/${w.slug}`} className="block">
              <Card className="press flex items-center gap-3 p-4 hover:border-[var(--border-strong)] hover:shadow-sm">
                <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-sm font-semibold text-[var(--brand-fg)]">
                  {w.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{w.name}</span>
                  <span className="block truncate text-xs text-[var(--text-tertiary)]">
                    {w.organizationName} · {w.role}
                  </span>
                </span>
                <ArrowRight className="size-4 text-[var(--text-tertiary)]" />
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </PageContainer>
  );
}
