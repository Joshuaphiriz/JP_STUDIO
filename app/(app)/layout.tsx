import { ThemeStyle } from "@/components/theme/theme-style";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AppShell } from "@/components/shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { getMyWorkspaces, verifySession } from "@/lib/dal";
import { getEffectiveTheme } from "@/lib/theme/service";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, workspaces, theme] = await Promise.all([
    verifySession(),
    getMyWorkspaces(),
    getEffectiveTheme(),
  ]);

  return (
    <>
      {/* Rendered after the root <head> style, so it wins the cascade. */}
      <ThemeStyle config={theme.config} id="jp-theme" />
      <ServiceWorker />
      <ThemeProvider initialConfig={theme.config}>
        <TooltipProvider delayDuration={200}>
          <AppShell workspaces={workspaces} user={user}>
            {children}
          </AppShell>
        </TooltipProvider>
      </ThemeProvider>
    </>
  );
}
