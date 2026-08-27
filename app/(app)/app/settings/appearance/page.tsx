import { ThemeEditor } from "@/components/theme-editor/theme-editor";
import { getEffectiveTheme } from "@/lib/theme/service";

export const metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const { config } = await getEffectiveTheme();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Appearance</h1>
      <p className="mt-1 mb-6 text-sm text-[var(--text-tertiary)]">
        Every color, corner, and font is a token. Changes preview instantly and
        save to your account.
      </p>
      <ThemeEditor initial={config} />
    </>
  );
}
