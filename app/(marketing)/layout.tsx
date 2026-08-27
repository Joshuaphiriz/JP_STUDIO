import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getOptionalUser } from "@/lib/dal";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOptionalUser().catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="material sticky top-0 z-40 border-b border-[var(--border)]">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="JP Studio home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link href="/app">Open app</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-in">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-[var(--text-tertiary)] sm:flex-row">
          <span>© {new Date().getFullYear()} JP Studio</span>
          <div className="flex gap-4">
            <Link
              href="/legal/privacy"
              className="hover:text-[var(--text-primary)]"
            >
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              className="hover:text-[var(--text-primary)]"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
