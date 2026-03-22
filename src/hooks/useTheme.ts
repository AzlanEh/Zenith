import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

export const useTheme = () => {
  const { theme, loadTheme } = useAppStore();

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme) {
      root.style.setProperty("--color-primary", theme.colors.primary);
      root.style.setProperty("--color-secondary", theme.colors.secondary);
      root.style.setProperty("--color-background", theme.colors.background);
      root.style.setProperty("--color-surface", theme.colors.surface);
      root.style.setProperty("--color-text", theme.colors.text);
      root.style.setProperty("--color-text-secondary", theme.colors.textSecondary);
      root.style.setProperty("--color-accent", theme.colors.accent);
      root.style.setProperty("--color-warning", theme.colors.warning);
      root.style.setProperty("--color-danger", theme.colors.danger);
      root.style.setProperty("--font-family", theme.fonts.family);
    } else {
      // Clear CSS properties when theme is null
      root.style.removeProperty("--color-primary");
      root.style.removeProperty("--color-secondary");
      root.style.removeProperty("--color-background");
      root.style.removeProperty("--color-surface");
      root.style.removeProperty("--color-text");
      root.style.removeProperty("--color-text-secondary");
      root.style.removeProperty("--color-accent");
      root.style.removeProperty("--color-warning");
      root.style.removeProperty("--color-danger");
      root.style.removeProperty("--font-family");
    }
  }, [theme]);

  return theme;
};