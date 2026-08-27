import { resolveTheme } from "@/lib/theme/resolve";
import type { ThemeConfig } from "@/lib/theme/types";

const MODE_SCRIPT = `(function(){try{var m=localStorage.getItem("jp-mode");var d=document.documentElement;if(m==="light"||m==="dark"){d.setAttribute("data-theme",m);}else{d.removeAttribute("data-theme");}}catch(e){}})();`;

/**
 * Server component. Emits the resolved design-token CSS inline (no flash). The
 * root layout renders it once with the default theme; the app layout renders it
 * again (later in the DOM, so it wins the cascade) with the user's theme.
 * The blocking mode script is emitted only with `withModeScript`.
 */
export function ThemeStyle({
  config,
  id = "jp-theme",
  withModeScript = false,
}: {
  config: ThemeConfig;
  id?: string;
  withModeScript?: boolean;
}) {
  const { css } = resolveTheme(config);
  return (
    <>
      {withModeScript && (
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
      )}
      <style id={id} dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}
