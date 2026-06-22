import { useEffect } from "react";

type Page = "dashboard" | "focus" | "goals" | "analytics" | "limits" | "settings";

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(
  navigate: (page: Page) => void,
  onToggleShortcutsModal: () => void,
  onToggleFocus?: () => void,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === "?" && !ctrl) {
        e.preventDefault();
        onToggleShortcutsModal();
        return;
      }

      if (!ctrl) return;
      e.preventDefault();

      const shortcuts: ShortcutMap = {
        d: () => navigate("dashboard"),
        f: () => navigate("focus"),
        g: () => navigate("goals"),
        a: () => navigate("analytics"),
        l: () => navigate("limits"),
        ",": () => navigate("settings"),
        F: () => onToggleFocus?.(),
      };

      const action = shortcuts[e.key];
      if (action) action();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, onToggleShortcutsModal, onToggleFocus]);
}
