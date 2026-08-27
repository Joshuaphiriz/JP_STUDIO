import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageContainer } from "@/components/shell/page-header";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageContainer>
      <Link
        href="/app"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
      >
        <ChevronLeft className="size-4" /> Back to app
      </Link>
      {children}
    </PageContainer>
  );
}
