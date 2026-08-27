import { Construction } from "lucide-react";
import { PageContainer } from "./page-header";

export function ComingSoon({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children?: React.ReactNode;
}) {
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-0)] px-6 py-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface-2)]">
          <Construction className="size-6 text-[var(--text-tertiary)]" />
        </span>
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        <p className="mt-1 max-w-sm text-sm text-[var(--text-tertiary)]">
          {children ?? `Lands in ${phase}.`}
        </p>
        <span className="mt-4 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
          {phase}
        </span>
      </div>
    </PageContainer>
  );
}
