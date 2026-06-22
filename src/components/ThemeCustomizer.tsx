import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Theme } from "@/types";

const THEME_STORAGE_KEY = "zenith-custom-theme";

const COLOR_FIELDS: { key: keyof Theme["colors"]; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "textSecondary", label: "Text Secondary" },
  { key: "accent", label: "Accent" },
  { key: "warning", label: "Warning" },
  { key: "danger", label: "Danger" },
];

function loadSavedTheme(): Promise<Theme | null> {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved) try { return Promise.resolve(JSON.parse(saved)); } catch { /* ignore */ }
  return api.getTheme().catch(() => null);
}

function saveToStorage(theme: Theme) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
}

// ponytail: localStorage instead of api.setTheme (no backend command yet)

export function ThemeCustomizer() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSavedTheme().then(setTheme);
  }, []);

  const updateColor = (key: keyof Theme["colors"], value: string) => {
    setTheme((prev) => {
      if (!prev) return prev;
      const next = { ...prev, colors: { ...prev.colors, [key]: value } };
      saveToStorage(next);
      return next;
    });
  };

  const handleSave = async () => {
    if (!theme) return;
    setSaving(true);
    saveToStorage(theme);
    toast.success("Theme saved");
    setSaving(false);
  };

  const handleReset = async () => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    const fresh = await api.getTheme().catch(() => null);
    if (fresh) setTheme(fresh);
  };

  if (!theme) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {COLOR_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
            <input
              type="color"
              value={theme.colors[key]}
              onChange={(e) => updateColor(key, e.target.value)}
              className="w-10 h-10 rounded border border-input cursor-pointer bg-transparent"
            />
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs font-mono text-muted-foreground">{theme.colors[key]}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Font family</label>
        <input
          value={theme.fonts.family}
          onChange={(e) =>
            setTheme((prev) => prev ? { ...prev, fonts: { ...prev.fonts, family: e.target.value } } : prev)
          }
          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Live preview */}
      <div
        className="rounded-xl border p-6 space-y-3"
        style={{
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          borderColor: theme.colors.secondary,
        }}
      >
        <p className="text-lg font-bold" style={{ fontFamily: theme.fonts.family }}>Preview</p>
        <button
          className="px-4 py-2 rounded text-sm font-medium"
          style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
        >
          Primary Button
        </button>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: theme.colors.surface, color: theme.colors.text }}
        >
          Surface card with some text
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>Save Theme</Button>
        <Button variant="outline" onClick={handleReset}>Reset</Button>
      </div>
    </div>
  );
}
