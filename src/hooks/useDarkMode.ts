import { useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "zenith-theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const resolvedTheme = useMemo<"light" | "dark">(
    () => theme === "system" ? getSystemTheme() : theme,
    [theme],
  );

  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = theme === "system" ? getSystemTheme() : theme;
    root.classList.remove("light", "dark");
    root.classList.add(effectiveTheme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const t = getSystemTheme();
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(t);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setThemeState(newTheme);
  };

  return { theme, resolvedTheme, setTheme, isDark: resolvedTheme === "dark" };
}
