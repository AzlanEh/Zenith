import {
  save,
  confirm as tauriConfirm,
  message as tauriMessage,
} from "@tauri-apps/plugin-dialog";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataImport } from "../components/DataImport";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { logger } from "../utils/logger";
import { FocusScheduleEditor } from "../components/FocusScheduleEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useDarkMode } from "../hooks/useDarkMode";
import { useUpdater } from "../hooks/useUpdater";
import {
  useFocusSettings,
  useNotificationSettings,
  useUpdateFocusSettings,
  useUpdateNotificationSettings,
} from "../queries";
import { api } from "../services/api";
import type { AutostartStatus, BreakSettings } from "../types";

function Toggle({
  pressed,
  onPressedChange,
  id,
}: {
  pressed: boolean;
  onPressedChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <button
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={`w-14 h-6 border relative flex items-center px-1 transition-colors ${
        pressed
          ? "border-foreground bg-foreground/20"
          : "border-border bg-background"
      }`}
      {...(id ? { "aria-labelledby": id } : {})}
    >
      <div
        className={`w-4 h-4 absolute transition-all ${
          pressed ? "bg-foreground right-1" : "bg-border left-1"
        }`}
      />
    </button>
  );
}

function MiniToggle({
  pressed,
  onPressedChange,
  id,
}: {
  pressed: boolean;
  onPressedChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <button
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={`w-10 h-5 border relative flex items-center px-1 transition-colors ${
        pressed
          ? "border-foreground bg-foreground/20"
          : "border-border bg-background"
      }`}
      {...(id ? { "aria-labelledby": id } : {})}
    >
      <div
        className={`w-3 h-3 absolute transition-all ${
          pressed ? "bg-foreground right-1" : "bg-border left-1"
        }`}
      />
    </button>
  );
}

function BrutalSlider({
  value,
  onChange,
  min,
  max,
  label,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
  id: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label
          className="font-label text-xs uppercase tracking-widest text-muted-foreground"
          htmlFor={id}
        >
          {label}
        </label>
        <span className="font-label text-xs text-foreground">
          {value} MIN
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export function Settings() {
  const { theme, setTheme } = useDarkMode();
  const { state: updateState, checkForUpdate, installUpdate } = useUpdater();
  const showLinuxUpdateHint =
    updateState.status === "error" &&
    updateState.code === "system-managed-install";
  const { data: focusSettings, isLoading: loadingFocusSettings } =
    useFocusSettings();
  const { data: notificationSettings, isLoading: loadingNotificationSettings } =
    useNotificationSettings();
  const updateFocusSettingsMutation = useUpdateFocusSettings();
  const updateNotificationSettingsMutation = useUpdateNotificationSettings();

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
    api
      .getAutostartStatus()
      .then(setAutostartStatus)
      .catch((e) => {
        logger.error("Failed to load autostart status:", e);
      });
    api
      .getBreakSettings()
      .then(setBreakSettings)
      .catch((e) => {
        logger.error("Failed to load break settings:", e);
        setBreakSettings({
          enabled: false,
          work_minutes: 50,
          break_minutes: 10,
          show_notification: true,
          play_sound: false,
        });
        toast.error("Using default break settings");
      });
  }, []);

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
      logger.error("Autostart error:", e);
      toast.error("Failed to update autostart setting");
    }
  };

  const updateBreakSettings = async (updates: Partial<BreakSettings>) => {
    if (!breakSettings) return;
    const prev = breakSettings;
    const next = { ...breakSettings, ...updates };
    setBreakSettings(next);
    try {
      await api.setBreakSettings(next);
    } catch (e) {
      logger.error("Break settings update error:", e);
      setBreakSettings(prev);
      toast.error("Failed to update break settings");
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
        defaultPath: `zenith-export-${startDate}-to-${endDate}.${ext}`,
        filters: [{ name: format.toUpperCase(), extensions: [ext] }],
      });

      if (filePath) {
        await api.saveExportFile(filePath, content);
        setExportMessage(`Saved to ${filePath}`);
      } else {
        setExportMessage(null);
      }
    } catch (e) {
      logger.error("Export failed", e);
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

      const confirmation = window.prompt(
        "Type DELETE to confirm permanent data removal:",
      );
      if (confirmation !== "DELETE") {
        await tauriMessage("Data deletion cancelled.", {
          title: "Cancelled",
          kind: "info",
        });
        return;
      }

      await api.wipeAllData(confirmation);
      await tauriMessage("All data has been successfully deleted.", {
        title: "Success",
        kind: "info",
      });
      window.location.reload();
    } catch (e) {
      logger.error("Failed to wipe data", e);
      await tauriMessage("Failed to delete data. Please try again.", {
        title: "Error",
        kind: "error",
      });
    }
  };

  if (loadingFocusSettings || loadingNotificationSettings || !breakSettings) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex-1 p-6 md:p-12 lg:p-16 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="mb-12 border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="font-label text-xs uppercase tracking-widest text-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-foreground inline-block" />
              System Configuration
            </p>
            <h2 className="font-headline text-4xl md:text-5xl font-light text-foreground tracking-tighter">
              Settings
            </h2>
          </div>
          <div className="font-label text-xs text-muted-foreground uppercase tracking-widest text-right">
            <p className="flex items-center justify-end gap-1 mb-1">
              Status:
              <span className="material-symbols-outlined text-[14px] text-foreground">
                check_circle
              </span>
              <span className="text-foreground font-bold">Online</span>
            </p>
            <p>Uptime: 48:12:00</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1px] bg-border border border-border">
          {/* MODULE: Appearance & System */}
          <section className="bg-card p-6 md:p-8 flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-foreground">
                  palette
                </span>
                <h3 className="font-headline text-2xl text-foreground">
                  Appearance
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`border p-4 flex flex-col items-center gap-3 transition-colors group ${
                    theme === "light"
                      ? "border-foreground bg-secondary text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span className="material-symbols-outlined">light_mode</span>
                  <span className="font-label text-xs uppercase tracking-widest">
                    Light
                  </span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`border p-4 flex flex-col items-center gap-3 transition-colors group ${
                    theme === "dark"
                      ? "border-foreground bg-secondary text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    dark_mode
                  </span>
                  <span className="font-label text-xs uppercase tracking-widest">
                    Dark
                  </span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`border p-4 flex flex-col items-center gap-3 transition-colors group ${
                    theme === "system"
                      ? "border-foreground bg-secondary text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    settings_brightness
                  </span>
                  <span className="font-label text-xs uppercase tracking-widest">
                    System
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-8 border-t border-border border-dashed">
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-foreground">
                  terminal
                </span>
                <h3 className="font-headline text-2xl text-foreground">
                  System Logic
                </h3>
              </div>
              <div className="flex items-center justify-between p-4 border border-border bg-background">
                <div>
                  <p
                    className="font-label text-sm text-foreground uppercase tracking-wide"
                    id="start-login-label"
                  >
                    Start at Login
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    Initialize sequence on system boot.
                  </p>
                </div>
                <Toggle
                  pressed={autostartStatus?.enabled || false}
                  onPressedChange={handleToggleAutostart}
                  id="start-login-label"
                />
              </div>
            </div>
          </section>

          {/* MODULE: Focus Profile */}
          <section className="bg-card p-6 md:p-8 flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-foreground">
                  center_focus_strong
                </span>
                <h3 className="font-headline text-2xl text-foreground">
                  Focus Preferences
                </h3>
              </div>
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="font-label text-xs uppercase tracking-widest text-muted-foreground">
                    Default Duration (Min)
                  </label>
                  <Select
                    value={String(focusSettings?.default_duration_minutes ?? 25)}
                    onValueChange={(val) =>
                      updateFocusSettingsMutation.mutate({
                        default_duration_minutes: parseInt(val),
                      })
                    }
                  >
                    <SelectTrigger className="w-full bg-background border-border text-foreground font-label p-3 uppercase focus:border-foreground focus:ring-0 rounded-none h-auto">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-border bg-card">
                      <SelectItem value="15">15 Minutes</SelectItem>
                      <SelectItem value="25">25 Minutes</SelectItem>
                      <SelectItem value="45">45 Minutes</SelectItem>
                      <SelectItem value="60">60 Minutes</SelectItem>
                      <SelectItem value="90">90 Minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 border border-border bg-background">
                  <span
                    className="font-label text-sm text-foreground uppercase tracking-wide"
                    id="mute-label"
                  >
                    Mute External Notifications
                  </span>
                  <Toggle
                    pressed={focusSettings?.block_notifications ?? false}
                    onPressedChange={(v) =>
                      updateFocusSettingsMutation.mutate({
                        block_notifications: v,
                      })
                    }
                    id="mute-label"
                  />
                </div>
                <div className="flex items-center justify-between p-4 border border-border bg-background">
                  <span
                    className="font-label text-sm text-foreground uppercase tracking-wide"
                    id="session-alerts-label"
                  >
                    Session Alerts
                  </span>
                  <Toggle
                    pressed={focusSettings?.notify_on_end ?? false}
                    onPressedChange={(v) =>
                      updateFocusSettingsMutation.mutate({
                        notify_on_start: v,
                        notify_on_end: v,
                      })
                    }
                    id="session-alerts-label"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-border border-dashed">
              <div className="flex justify-between items-end mb-5">
                <h3 className="font-headline text-2xl text-foreground">
                  Schedules
                </h3>
              </div>
              <FocusScheduleEditor
                schedules={focusSettings?.schedules ?? []}
                onSave={async (schedules) => {
                  const existing = focusSettings;
                  if (!existing) return;
                  await updateFocusSettingsMutation.mutateAsync({
                    ...existing,
                    schedules,
                  });
                }}
              />
            </div>
          </section>

          {/* MODULE: Break Reminders */}
          <section className="bg-card p-6 md:p-8 flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-foreground">
                  hourglass_empty
                </span>
                <h3 className="font-headline text-2xl text-foreground">
                  Break Reminders
                </h3>
              </div>
              <div className="flex flex-col gap-6">
                <BrutalSlider
                  id="work-cycle"
                  label="Work Cycle"
                  min={15}
                  max={120}
                  value={breakSettings.work_minutes}
                  onChange={(v) => updateBreakSettings({ work_minutes: v })}
                />
                <BrutalSlider
                  id="break-cycle"
                  label="Break Cycle"
                  min={5}
                  max={30}
                  value={breakSettings.break_minutes}
                  onChange={(v) => updateBreakSettings({ break_minutes: v })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 border border-border bg-background">
                    <span
                      className="font-label text-xs text-foreground uppercase"
                      id="notify-label"
                    >
                      Notify
                    </span>
                    <MiniToggle
                      pressed={breakSettings.show_notification}
                      onPressedChange={(v) =>
                        updateBreakSettings({ show_notification: v })
                      }
                      id="notify-label"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border bg-background">
                    <span
                      className="font-label text-xs text-foreground uppercase"
                      id="sound-label"
                    >
                      Sound
                    </span>
                    <MiniToggle
                      pressed={breakSettings.play_sound}
                      onPressedChange={(v) =>
                        updateBreakSettings({ play_sound: v })
                      }
                      id="sound-label"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-border border-dashed">
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-foreground">
                  notifications
                </span>
                <h3 className="font-headline text-2xl text-foreground">
                  Notifications
                </h3>
              </div>
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between p-4 border border-border bg-background">
                  <div>
                    <span
                      className="font-label text-sm text-foreground uppercase tracking-wide"
                      id="master-override-label"
                    >
                      Master Override
                    </span>
                    <p className="font-body text-xs text-muted-foreground mt-1">
                      Enable all system alerts.
                    </p>
                  </div>
                  <Toggle
                    pressed={notificationSettings?.enabled ?? false}
                    onPressedChange={(v) =>
                      updateNotificationSettingsMutation.mutate({
                        enabled: v,
                      })
                    }
                    id="master-override-label"
                  />
                </div>
                <BrutalSlider
                  id="warning-threshold"
                  label="Limit Warning Threshold"
                  min={50}
                  max={95}
                  value={notificationSettings?.warning_threshold ?? 85}
                  onChange={(v) =>
                    updateNotificationSettingsMutation.mutate({
                      warning_threshold: v,
                    })
                  }
                />
              </div>
            </div>
          </section>

          {/* MODULE: Software & Data Management */}
          <section className="bg-card p-6 md:p-8 flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-foreground">
                  system_update_alt
                </span>
                <h3 className="font-headline text-2xl text-foreground">
                  Software
                </h3>
              </div>
              <div className="border border-border p-6 bg-background flex flex-col items-center justify-center text-center gap-4">
                <span className="material-symbols-outlined text-4xl text-foreground font-light">
                  check_circle
                </span>
                <div>
                  <p className="font-label text-lg text-foreground tracking-widest">
                    v0.1.5
                  </p>
                  <p className="font-label text-xs text-muted-foreground uppercase mt-1">
                    {updateState.status === "up-to-date"
                      ? "System is up to date"
                      : updateState.status === "available"
                        ? `Version ${updateState.info.version} available`
                        : "System is up to date"}
                  </p>
                </div>
                <button
                  onClick={() => checkForUpdate(false)}
                  disabled={
                    updateState.status === "checking" ||
                    updateState.status === "downloading" ||
                    updateState.status === "installing"
                  }
                  className="mt-2 border border-foreground px-6 py-2 font-label text-xs uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background transition-colors w-full disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${updateState.status === "checking" ? "animate-spin" : ""}`}
                  />
                  {updateState.status === "checking"
                    ? "Checking..."
                    : "Check for Updates"}
                </button>
                {updateState.status === "available" && (
                  <button
                    onClick={() => installUpdate()}
                    className="border border-foreground px-6 py-2 font-label text-xs uppercase tracking-widest bg-foreground text-background hover:opacity-90 transition-opacity w-full"
                  >
                    Install Update
                  </button>
                )}
              </div>
              {updateState.status === "downloading" && (
                <p className="font-label text-xs text-foreground mt-2">
                  Downloading update... {updateState.progress}%
                </p>
              )}
              {updateState.status === "installing" && (
                <p className="font-label text-xs text-foreground mt-2">
                  Installing update... the app will restart automatically.
                </p>
              )}
              {updateState.status === "error" && (
                <p className="font-label text-xs text-destructive mt-2">
                  {updateState.message}
                </p>
              )}
              {showLinuxUpdateHint && (
                <p className="font-label text-xs text-muted-foreground mt-2">
                  Note: In-app updates may not work for distro-managed installs.
                </p>
              )}
            </div>

            <div className="pt-8 border-t border-border border-dashed">
              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-foreground">
                  shield_lock
                </span>
                <h3 className="font-headline text-2xl text-foreground">
                  Data Management
                </h3>
              </div>
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="font-label text-xs uppercase tracking-widest text-muted-foreground">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate}
                      className="bg-background border border-border text-foreground font-label p-3 text-sm focus:border-foreground focus:ring-0 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label text-xs uppercase tracking-widest text-muted-foreground">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="bg-background border border-border text-foreground font-label p-3 text-sm focus:border-foreground focus:ring-0 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExport("csv")}
                    className="border border-border bg-background p-3 font-label text-xs uppercase tracking-widest text-foreground hover:bg-secondary transition-colors flex justify-center items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">
                      download
                    </span>
                    Export CSV
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    className="border border-border bg-background p-3 font-label text-xs uppercase tracking-widest text-foreground hover:bg-secondary transition-colors flex justify-center items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">
                      download
                    </span>
                    Export JSON
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border border-border bg-background">
                  <div>
                    <p className="font-label text-sm text-foreground uppercase tracking-wide">
                      Import Data
                    </p>
                    <p className="font-body text-xs text-muted-foreground mt-1">
                      Upload a previously exported file.
                    </p>
                  </div>
                  <DataImport />
                </div>
                <button
                  onClick={handleWipeData}
                  className="border border-destructive text-destructive bg-destructive/10 p-4 font-label text-sm uppercase tracking-widest hover:bg-destructive hover:text-destructive-foreground transition-colors flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined">
                    delete_forever
                  </span>
                  Delete All Data
                </button>
                {exportMessage && (
                  <p className="font-label text-xs text-foreground">
                    {exportMessage}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
}
