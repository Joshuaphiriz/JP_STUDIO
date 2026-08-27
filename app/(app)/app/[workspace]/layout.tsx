import { requireWorkspace } from "@/lib/dal";
import { rememberWorkspace } from "@/lib/workspace-prefs";

export default async function WorkspaceLayout({
  params,
  children,
}: LayoutProps<"/app/[workspace]">) {
  const { workspace } = await params;
  const ws = await requireWorkspace(workspace);
  // fire-and-forget: keep "last opened" fresh
  void rememberWorkspace(ws.user.id, ws.id).catch(() => {});
  return <>{children}</>;
}
