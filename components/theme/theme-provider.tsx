"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { resolveTheme } from "@/lib/theme/resolve";
import {
  DENSITY_SCALE,
  type ThemeConfig,
  themeConfigSchema,
} from "@/lib/theme/types";

type Mode = ThemeConfig["mode"];

type ThemeContextValue = {
  config: ThemeConfig;
  mode: Mode;
  /** merge a partial config and apply it live to the document */
  preview: (patch: Partial<ThemeConfig>) => void;
  /** reset the live preview back to the last committed config */
  resetPreview: () => void;
  setMode: (mode: Mode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyVars(config: ThemeConfig) {
  const { baseVars, lightVars, darkVars } = resolveTheme(config);
  const root = document.documentElement;
  const isDark =
    root.getAttribute("data-theme") === "dark" ||
    (!root.hasAttribute("data-theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const vars = { ...baseVars, ...(isDark ? darkVars : lightVars) };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.setProperty("--density", String(DENSITY_SCALE[config.density]));
}

export function ThemeProvider({
  initialConfig,
  children,
}: {
  initialConfig: ThemeConfig;
  children: React.ReactNode;
}) {
  const committed = useMemo(
    () => themeConfigSchema.parse(initialConfig),
    [initialConfig],
  );
  const [config, setConfig] = useState<ThemeConfig>(committed);
  const [mode, setModeState] = useState<Mode>(committed.mode);

  // keep live vars in sync whenever the working config changes
  useEffect(() => {
    applyVars(config);
  }, [config]);

  // react to OS scheme changes while in "system" mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!document.documentElement.hasAttribute("data-theme"))
        applyVars(config);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [config]);

  const preview = useCallback((patch: Partial<ThemeConfig>) => {
    setConfig((prev) => themeConfigSchema.parse({ ...prev, ...patch }));
  }, []);

  const resetPreview = useCallback(() => setConfig(committed), [committed]);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    const root = document.documentElement;
    try {
      if (next === "system") {
        localStorage.removeItem("jp-mode");
        root.removeAttribute("data-theme");
      } else {
        localStorage.setItem("jp-mode", next);
        root.setAttribute("data-theme", next);
      }
    } catch {
      /* private mode */
    }
    setConfig((prev) => ({ ...prev, mode: next }));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ config, mode, preview, resetPreview, setMode }),
    [config, mode, preview, resetPreview, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
