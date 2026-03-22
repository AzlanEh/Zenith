import { useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { api } from "../services/api";
import {
  save,
  confirm as tauriConfirm,
  message as tauriMessage,
} from "@tauri-apps/plugin-dialog";
import type { BreakSettings, AutostartStatus } from "../types";
import { useDarkMode } from "../hooks/useDarkMode";
import { useUpdater } from "../hooks/useUpdater";
import { CheckCircle2, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export function Settings() {
  const { theme, setTheme } = useDarkMode();
  const { state: updateState, checkForUpdate } = useUpdater();
  const {
    focusSettings,
    notificationSettings,
    loadFocusSettings,
    loadNotificationSettings,
    updateFocusSettings,
    updateNotificationSettings,
  } = useAppStore();

  const [autostartStatus, setAutostartStatus] =
    useState<AutostartStatus | null>(null);
  const [breakSettings, setBreakSettings] = useState<BreakSettings | null>(
    null,
  );

  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    loadFocusSettings();
    loadNotificationSettings();
    api.getAutostartStatus().then(setAutostartStatus).catch(console.error);
    api.getBreakSettings().then(setBreakSettings).catch(console.error);
  }, [loadFocusSettings, loadNotificationSettings]);

  const handleToggleAutostart = async (enabled: boolean) => {
    try {
      if (enabled) {
        await api.enableAutostart();
      } else {
        await api.disableAutostart();
      }
      const status = await api.getAutostartStatus();
      setAutostartStatus(status);
    } catch (e) {
      console.error("Autostart error:", e);
    }
  };

  const updateBreakSettings = async (updates: Partial<BreakSettings>) => {
    if (!breakSettings) return;
    const next = { ...breakSettings, ...updates };
    setBreakSettings(next);
    try {
      await api.setBreakSettings(next);
    } catch (e) {
      console.error("Break settings update error:", e);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    setExportMessage("Exporting...");
    try {
      const records = await api.exportUsageData(startDate, endDate);
      if (records.length === 0) {
        setExportMessage("No data found for the selected date range.");
        setTimeout(() => setExportMessage(null), 3000);
        return;
      }

      let content = "";
      let ext = "";
      if (format === "csv") {
        content = await api.formatExportCsv(records);
        ext = "csv";
      } else {
        content = await api.formatExportJson(records);
        ext = "json";
      }

      const filePath = await save({
        defaultPath: `wellbeing-export-${startDate}-to-${endDate}.${ext}`,
        filters: [{ name: format.toUpperCase(), extensions: [ext] }],
      });

      if (filePath) {
        await api.saveExportFile(filePath, content);
        setExportMessage(`Saved to ${filePath}`);
      } else {
        setExportMessage(null);
      }
    } catch (e) {
      console.error("Export failed", e);
      setExportMessage("Export failed.");
    }
    setTimeout(() => setExportMessage(null), 3000);
  };

  const handleWipeData = async () => {
    try {
      const isConfirmed = await tauriConfirm(
        "Are you sure you want to permanently delete all your data? This action cannot be undone.",
        { title: "Delete All Data", kind: "warning" },
      );

      if (!isConfirmed) {
        return;
      }

      await api.wipeAllData();
      await tauriMessage("All data has been successfully deleted.", {
        title: "Success",
        kind: "info",
      });
      // Refresh to reset the UI context
      window.location.reload();
    } catch (e) {
      console.error("Failed to wipe data", e);
      await tauriMessage("Failed to delete data. Please try again.", {
        title: "Error",
        kind: "error",
      });
    }
  };

  if (!focusSettings || !notificationSettings || !breakSettings) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full space-y-6 lg:space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Profile Section - Decorative */}
      <section className="glass-panel p-8 rounded-lg">
        <h3 className="text-xl font-serif-accent text-foreground mb-6">
          Profile
        </h3>
        <div className="flex flex-col sm:flex-row items-start gap-8">
          <div className="relative group cursor-pointer flex-shrink-0">
            <img
              alt="Avatar"
              className="size-24 rounded-full object-cover border-2 border-border"
              src="https://ui-avatars.com/api/?name=Local+User&background=random"
            />
          </div>

          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6 opacity-70 pointer-events-none">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                First Name
              </label>
              <input
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                type="text"
                defaultValue="Local"
                disabled
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Last Name
              </label>
              <input
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                type="text"
                defaultValue="User"
                disabled
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">
                Account Type
              </label>
              <input
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                type="text"
                defaultValue="Offline Device Profile"
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                Data is stored locally on your device.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="glass-panel p-8 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-serif-accent text-foreground">
              Appearance
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Customize how ZenFocus looks on your device.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <label className="cursor-pointer group">
            <input
              checked={theme === "light"}
              onChange={() => setTheme("light")}
              className="peer sr-only"
              name="theme"
              type="radio"
              value="light"
            />
            <div className="border border-border p-4 hover:border-primary peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary transition-all bg-secondary/20 rounded-lg">
              <div className="space-y-2 bg-[#F6F6F6] p-3 border border-gray-200 mb-3 rounded-md">
                <div className="space-y-1">
                  <div className="h-2 w-3/4 bg-gray-300 rounded"></div>
                  <div className="h-2 w-1/2 bg-gray-300 rounded"></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="h-4 w-4 rounded-full bg-gray-300"></div>
                  <div className="h-4 w-4 bg-gray-800 rounded"></div>
                </div>
              </div>
              <span className="block text-sm font-medium text-center text-foreground">
                Light
              </span>
            </div>
          </label>

          <label className="cursor-pointer group">
            <input
              checked={theme === "dark"}
              onChange={() => setTheme("dark")}
              className="peer sr-only"
              name="theme"
              type="radio"
              value="dark"
            />
            <div className="border border-border p-4 hover:border-primary peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary transition-all bg-secondary/20 rounded-lg">
              <div className="space-y-2 bg-[#1A1A1A] p-3 border border-gray-700 mb-3 rounded-md">
                <div className="space-y-1">
                  <div className="h-2 w-3/4 bg-gray-600 rounded"></div>
                  <div className="h-2 w-1/2 bg-gray-600 rounded"></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="h-4 w-4 rounded-full bg-gray-600"></div>
                  <div className="h-4 w-4 bg-gray-300 rounded"></div>
                </div>
              </div>
              <span className="block text-sm font-medium text-center text-foreground">
                Dark
              </span>
            </div>
          </label>

          <label className="cursor-pointer group">
            <input
              checked={theme === "system"}
              onChange={() => setTheme("system")}
              className="peer sr-only"
              name="theme"
              type="radio"
              value="system"
            />
            <div className="border border-border p-4 hover:border-primary peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary transition-all bg-secondary/20 rounded-lg">
              <div className="relative overflow-hidden mb-3 border border-gray-300 dark:border-gray-700 rounded-md h-[78px]">
                <div className="flex h-full">
                  <div className="w-1/2 bg-[#F6F6F6] p-3 space-y-2 border-r border-gray-300 dark:border-gray-700">
                    <div className="h-2 w-3/4 bg-gray-300 rounded"></div>
                    <div className="h-2 w-1/2 bg-gray-300 rounded"></div>
                  </div>
                  <div className="w-1/2 bg-[#1A1A1A] p-3 space-y-2">
                    <div className="h-2 w-3/4 bg-gray-600 rounded"></div>
                    <div className="h-2 w-1/2 bg-gray-600 rounded"></div>
                  </div>
                </div>
              </div>
              <span className="block text-sm font-medium text-center text-foreground">
                System
              </span>
            </div>
          </label>
        </div>
      </section>

      {/* Startup & System */}
      <section className="glass-panel p-8 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-serif-accent text-foreground">
              System
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Application startup and OS integrations.
            </p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <h4 className="font-medium text-foreground">Start at Login</h4>
              <p className="text-xs text-muted-foreground">
                Launch automatically when you sign in
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autostartStatus?.enabled || false}
                onChange={(e) => handleToggleAutostart(e.target.checked)}
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Focus Preferences */}
      <section className="glass-panel p-8 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-serif-accent text-foreground">
              Focus Preferences
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Customize your ideal working environment.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-border/50">
            <div>
              <h4 className="font-medium text-foreground">
                Default Focus Session
              </h4>
              <p className="text-xs text-muted-foreground">
                Standard duration for Pomodoro timers
              </p>
            </div>
            <div className="w-[140px]">
              <Select
                value={String(focusSettings.default_duration_minutes)}
                onValueChange={(val) =>
                  updateFocusSettings({
                    default_duration_minutes: parseInt(val),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="25">25 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <h4 className="font-medium text-foreground">
                Mute Notifications
              </h4>
              <p className="text-xs text-muted-foreground">
                Automatically silence alerts during focus
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={focusSettings.block_notifications}
                onChange={(e) =>
                  updateFocusSettings({ block_notifications: e.target.checked })
                }
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <h4 className="font-medium text-foreground">Session Alerts</h4>
              <p className="text-xs text-muted-foreground">
                Notify when sessions start or end
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={focusSettings.notify_on_end}
                onChange={(e) =>
                  updateFocusSettings({
                    notify_on_start: e.target.checked,
                    notify_on_end: e.target.checked,
                  })
                }
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Break Reminders */}
      <section className="glass-panel p-8 rounded-lg">
        <h3 className="text-xl font-serif-accent text-foreground mb-6">
          Break Reminders
        </h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-chart-1/10 flex items-center justify-center text-chart-1">
                <span className="material-symbols-outlined text-xl">
                  self_improvement
                </span>
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm">
                  Enable Breaks
                </h4>
                <p className="text-xs text-muted-foreground">
                  Periodic reminders to step away
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={breakSettings.enabled}
                onChange={(e) =>
                  updateBreakSettings({ enabled: e.target.checked })
                }
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {breakSettings.enabled && (
            <div className="pl-14 space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Work Duration: {breakSettings.work_minutes}m
                </span>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  className="w-1/2"
                  value={breakSettings.work_minutes}
                  onChange={(e) =>
                    updateBreakSettings({
                      work_minutes: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Break Duration: {breakSettings.break_minutes}m
                </span>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  className="w-1/2"
                  value={breakSettings.break_minutes}
                  onChange={(e) =>
                    updateBreakSettings({
                      break_minutes: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-6 mt-4">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={breakSettings.show_notification}
                    onChange={(e) =>
                      updateBreakSettings({
                        show_notification: e.target.checked,
                      })
                    }
                  />
                  Show Notification
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={breakSettings.play_sound}
                    onChange={(e) =>
                      updateBreakSettings({ play_sound: e.target.checked })
                    }
                  />
                  Play Sound
                </label>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Notifications */}
      <section className="glass-panel p-8 rounded-lg">
        <h3 className="text-xl font-serif-accent text-foreground mb-6">
          Notifications
        </h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-chart-1/10 flex items-center justify-center text-chart-1">
                <span className="material-symbols-outlined text-xl">
                  notifications
                </span>
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm">
                  Master Toggle
                </h4>
                <p className="text-xs text-muted-foreground">
                  Allow system notifications
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notificationSettings.enabled}
                onChange={(e) =>
                  updateNotificationSettings({ enabled: e.target.checked })
                }
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="pl-14 pb-4 border-b border-border/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                Limit Warning: {notificationSettings.warning_threshold}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              className="w-full"
              value={notificationSettings.warning_threshold}
              onChange={(e) =>
                updateNotificationSettings({
                  warning_threshold: parseInt(e.target.value),
                })
              }
            />
          </div>

          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-chart-2/10 flex items-center justify-center text-chart-2">
                <span className="material-symbols-outlined text-xl">
                  do_not_disturb_on
                </span>
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm">
                  Do Not Disturb
                </h4>
                <p className="text-xs text-muted-foreground">
                  Silence notifications during specific hours
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notificationSettings.dnd_enabled}
                onChange={(e) =>
                  updateNotificationSettings({ dnd_enabled: e.target.checked })
                }
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {notificationSettings.dnd_enabled && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-4 pl-14 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">From</span>
                <div className="w-[100px]">
                  <Select
                    value={String(notificationSettings.dnd_start_hour)}
                    onValueChange={(val) =>
                      updateNotificationSettings({
                        dnd_start_hour: parseInt(val),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SelectItem key={`start-${i}`} value={String(i)}>
                          {`${i}:00`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">To</span>
                <div className="w-[100px]">
                  <Select
                    value={String(notificationSettings.dnd_end_hour)}
                    onValueChange={(val) =>
                      updateNotificationSettings({
                        dnd_end_hour: parseInt(val),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SelectItem key={`end-${i}`} value={String(i)}>
                          {`${i}:00`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Software Updates */}
      <section className="glass-panel p-8 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-serif-accent text-foreground">
              Software Updates
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Keep ZenFocus up to date.
            </p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-border/50">
            <div>
              <h4 className="font-medium text-foreground">Current Version</h4>
              <p className="text-xs text-muted-foreground font-mono">v0.1.3</p>
            </div>
            <div className="flex items-center gap-4">
              {updateState.status === "available" && (
                <span className="px-2 py-1 text-xs rounded bg-sky-500/15 text-sky-600 border border-sky-500/30">
                  v{updateState.info.version} available
                </span>
              )}
              {updateState.status === "up-to-date" && (
                <span className="flex items-center px-2 py-1 text-xs rounded text-green-600 border border-green-500/40">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Up to date
                </span>
              )}
              <button
                onClick={() => checkForUpdate(false)}
                disabled={
                  updateState.status === "checking" ||
                  updateState.status === "downloading" ||
                  updateState.status === "installing"
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground border border-border bg-background hover:bg-secondary transition-colors rounded disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${updateState.status === "checking" ? "animate-spin" : ""}`}
                />
                {updateState.status === "checking"
                  ? "Checking…"
                  : "Check for Updates"}
              </button>
            </div>
          </div>
          {updateState.status === "error" && (
            <p className="text-sm p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
              {updateState.message}
            </p>
          )}
        </div>
      </section>

      {/* Privacy & Security (Export Data) */}
      <section className="glass-panel p-8 rounded-lg">
        <h3 className="text-xl font-serif-accent text-foreground mb-6">
          Privacy & Security
        </h3>
        <div className="space-y-4">
          <div className="flex gap-4 items-end mb-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="block w-full bg-background border border-border rounded-lg p-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="block w-full bg-background border border-border rounded-lg p-2 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border border-border bg-card rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                Export Data
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download a copy of your usage data.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport("csv")}
                className="text-sm font-medium text-foreground border border-border px-3 py-1.5 hover:bg-secondary transition-colors bg-background rounded"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                className="text-sm font-medium text-foreground border border-border px-3 py-1.5 hover:bg-secondary transition-colors bg-background rounded"
              >
                Export JSON
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border border-red-900/20 bg-red-500/5 rounded-lg mt-4">
            <div>
              <h4 className="text-sm font-medium text-red-500">
                Delete All Data
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete all tracking history, limits, and settings.
              </p>
            </div>
            <button
              onClick={() => handleWipeData()}
              className="text-sm font-medium text-white bg-red-600 px-3 py-1.5 hover:bg-red-700 transition-colors rounded"
            >
              Delete Data
            </button>
          </div>
          {exportMessage && (
            <p className="text-sm text-primary mt-2 px-2">{exportMessage}</p>
          )}
        </div>
      </section>
    </div>
  );
}
