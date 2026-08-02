import {
  Activity,
  Music,
  Pause,
  Pen,
  Play,
  Settings,
  Square,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppIcon } from "../components/AppIcon";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { FocusSessionNotes } from "../components/FocusSessionNotes";
import { ManageBlocklistDialog } from "../components/ManageBlocklistDialog";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { useFocusHistory } from "../hooks/useFocusHistory";
import {
  useFocusSettings,
  useStartFocusSession,
  useStopFocusSession,
  useUpdateFocusSettings,
  useAddFocusBlockedApp,
  useRemoveFocusBlockedApp,
} from "../queries";
import { api } from "../services/api";
import { logger } from "../utils/logger";
import type { InstalledApp } from "../types";

type FocusTimerState = "idle" | "running" | "paused" | "completed" | "cancelled";

const DEFAULT_FOCUS_SECONDS = 25 * 60;

export function FocusMode() {
  const { data: settings } = useFocusSettings();
  const updateFocusSettingsMutation = useUpdateFocusSettings();
  const addFocusBlockedAppMutation = useAddFocusBlockedApp();
  const removeFocusBlockedAppMutation = useRemoveFocusBlockedApp();
  const startFocusSession = useStartFocusSession();
  const stopFocusSession = useStopFocusSession();

  const [timerState, setTimerState] = useState<FocusTimerState>("idle");
  const [timeLeft, setTimeLeft] = useState(DEFAULT_FOCUS_SECONDS);
  const [totalTime, setTotalTime] = useState(DEFAULT_FOCUS_SECONDS);
  const timeLeftRef = useRef(DEFAULT_FOCUS_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = () => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const updateTimeLeft = (seconds: number) => {
    timeLeftRef.current = seconds;
    setTimeLeft(seconds);
  };

  useEffect(() => clearTick, []);

  const start = () => {
    if (timerState === "running") return;
    clearTick();
    setTotalTime(timeLeftRef.current);
    intervalRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      if (timeLeftRef.current <= 0) {
        clearTick();
        setTimeLeft(0);
        setTimerState("completed");
      } else {
        setTimeLeft(timeLeftRef.current);
      }
    }, 1000);
    setTimerState("running");
  };

  const pause = () => {
    clearTick();
    setTimerState("paused");
  };

  const reset = () => {
    clearTick();
    updateTimeLeft(DEFAULT_FOCUS_SECONDS);
    setTotalTime(DEFAULT_FOCUS_SECONDS);
    setTimerState("idle");
  };

  const isFocusActive = timerState === "running";
  const isPaused = timerState === "paused";

  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const { addSession } = useFocusHistory();

  // Local state for modal settings
  const [localFocusMin, setLocalFocusMin] = useState(25);
  const [localShortBreak, setLocalShortBreak] = useState(5);
  const [localLongBreak, setLocalLongBreak] = useState(15);
  const [localAutoStartBreaks, setLocalAutoStartBreaks] = useState(false);
  const [localAutoStartSession, setLocalAutoStartSession] = useState(false);

  const hasReportedCompletion = useRef(false);

  useEffect(() => {
    if (isSettingsOpen && settings) {
      setLocalFocusMin(settings.default_duration_minutes);
    }
  }, [isSettingsOpen, settings]);

  useEffect(() => {
    if (timerState === "completed" && !hasReportedCompletion.current) {
      hasReportedCompletion.current = true;
      addSession({
        date: new Date().toISOString().split("T")[0],
        duration_minutes: Math.floor(totalTime / 60),
        completed: true,
        scheduled: false,
      });
      setNotesOpen(true);
    }
    if (timerState !== "completed") {
      hasReportedCompletion.current = false;
    }
  }, [timerState, totalTime, addSession]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const appsData = await api.getInstalledApps();
      setInstalledApps(appsData);

      if (timerState === "idle") {
        const storeTime = timeLeftRef.current;
        const defaultTime = (settings?.default_duration_minutes ?? 25) * 60;
        if (storeTime === DEFAULT_FOCUS_SECONDS || storeTime === defaultTime) {
          updateTimeLeft(defaultTime);
        }
      }
    } catch (e) {
      logger.error(e);
      toast.error("Failed to load focus settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBlockedApp = async (appName: string) => {
    try {
      await addFocusBlockedAppMutation.mutateAsync(appName);
      toast.success(`${appName} added to blocklist`);
    } catch (e) {
      logger.error("Failed to block app", e);
      toast.error("Failed to add app to blocklist");
    }
  };

  const handleRemoveBlockedApp = async (appName: string) => {
    try {
      await removeFocusBlockedAppMutation.mutateAsync(appName);
      toast.success(`${appName} removed from blocklist`);
    } catch (e) {
      logger.error("Failed to unblock app", e);
      toast.error("Failed to remove app from blocklist");
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      const newSettings = {
        ...settings,
        default_duration_minutes: localFocusMin,
      };
      await api.setFocusSettings(newSettings);
      updateFocusSettingsMutation.mutate({
        default_duration_minutes: localFocusMin,
      });

      if (!isFocusActive) {
        updateTimeLeft(localFocusMin * 60);
      }
      setIsSettingsOpen(false);
      toast.success("Timer settings saved");
    } catch (e) {
      logger.error("Failed to save settings", e);
      toast.error("Failed to save timer settings");
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Apps currently blocked
  const blockedAppsList = settings?.blocked_apps || [];

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-7xl mx-auto min-h-full flex-1 pb-12 w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto min-h-full flex-1 pb-12 w-full">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
          {/* Timer Section */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            <div className="glass-panel flex-1 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 relative overflow-hidden group rounded-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary rounded-full blur-3xl opacity-50 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col items-center justify-between h-full w-full max-w-md mx-auto">
                <div className="flex flex-col items-center gap-2">
                  <span className="px-3 py-1 bg-secondary text-xs font-medium tracking-widest uppercase border border-border">
                    Deep Work
                  </span>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Activity className="w-4 h-4" />
                    <span>Session 1 of 4</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center py-8 sm:py-12">
                  <div className="text-5xl sm:text-7xl lg:text-[10rem] leading-none font-mono font-light text-foreground tracking-tighter tabular-nums select-none transition-all">
                    {String(minutes).padStart(2, "0")}:
                    {String(seconds).padStart(2, "0")}
                  </div>
                  <div className="flex justify-center gap-2 mt-4">
                    <div className="h-1.5 w-1.5 bg-foreground rounded-full opacity-20"></div>
                    <div className="h-1.5 w-1.5 bg-foreground rounded-full"></div>
                    <div className="h-1.5 w-1.5 bg-foreground rounded-full opacity-20"></div>
                  </div>
                </div>

                <div className="w-full space-y-6">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Pen className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <input
                      type="text"
                      placeholder="What are you working on?"
                      className="w-full bg-background border border-border p-4 pl-11 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors rounded-none placeholder:text-muted-foreground text-center"
                      defaultValue="Writing Q3 Strategy Document"
                    />
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={
                        isFocusActive
                          ? () => {
                              pause();
                              stopFocusSession.mutate();
                            }
                          : isPaused
                            ? () => {
                                start();
                                startFocusSession.mutate(localFocusMin);
                              }
                            : () => {
                                start();
                                startFocusSession.mutate(localFocusMin);
                              }
                      }
                      className="flex-1 max-w-[200px] h-14 bg-foreground text-background hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 font-medium text-lg rounded-none"
                    >
                      {isFocusActive ? (
                        <Pause className="w-6 h-6 fill-current" />
                      ) : (
                        <Play className="w-6 h-6 fill-current" />
                      )}
                      <span>
                        {isFocusActive
                          ? "Pause"
                          : isPaused
                            ? "Resume"
                            : "Start Focus"}
                      </span>
                    </button>
                    <button
                      onClick={reset}
                      aria-label="Reset timer"
                      className="size-14 border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center rounded-none"
                    >
                      <Square className="w-5 h-5 fill-current" />
                    </button>
                  </div>

                  <div className="flex justify-center gap-6 pt-4 border-t border-border/50">
                    <Dialog
                      open={isSettingsOpen}
                      onOpenChange={setIsSettingsOpen}
                    >
                      <DialogTrigger asChild>
                        <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
                          <Settings className="w-4 h-4" />
                          Timer Settings
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl !p-0 bg-background border border-border shadow-2xl flex flex-col max-h-[90vh] rounded-none [&>button]:hidden">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-border flex justify-between items-end bg-background">
                          <div>
                            <span className="text-[0.65rem] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2 block">
                              Configuration
                            </span>
                            <h2 className="font-serif-accent text-4xl italic text-foreground">
                              Timer Settings
                            </h2>
                          </div>
                          <button
                            onClick={() => setIsSettingsOpen(false)}
                            aria-label="Close settings"
                            className="p-2 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </div>

                        {/* Modal Content (Scrollable Area) */}
                        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                          {/* Section: Durations */}
                          <section className="mb-12">
                            <h3 className="font-serif-accent text-xl mb-6 text-foreground">
                              Focus Intervals
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-3">
                                <label className="text-[0.65rem] uppercase tracking-widest font-mono text-muted-foreground">
                                  Focus (Min)
                                </label>
                                <div className="relative group">
                                  <input
                                    className="w-full bg-secondary/30 border-0 border-b-2 border-border focus:border-foreground focus:ring-0 font-mono text-2xl py-4 px-3 transition-all text-foreground outline-none"
                                    type="number"
                                    value={localFocusMin}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (!isNaN(val)) setLocalFocusMin(val);
                                    }}
                                  />
                                  <span className="absolute right-3 bottom-4 text-muted-foreground font-mono text-xs pointer-events-none">
                                    MIN
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <label className="text-[0.65rem] uppercase tracking-widest font-mono text-muted-foreground">
                                  Short Break
                                </label>
                                <div className="relative group">
                                  <input
                                    className="w-full bg-secondary/30 border-0 border-b-2 border-border focus:border-foreground focus:ring-0 font-mono text-2xl py-4 px-3 transition-all text-foreground outline-none"
                                    type="number"
                                    value={localShortBreak}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (!isNaN(val)) setLocalShortBreak(val);
                                    }}
                                  />
                                  <span className="absolute right-3 bottom-4 text-muted-foreground font-mono text-xs pointer-events-none">
                                    MIN
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <label className="text-[0.65rem] uppercase tracking-widest font-mono text-muted-foreground">
                                  Long Break
                                </label>
                                <div className="relative group">
                                  <input
                                    className="w-full bg-secondary/30 border-0 border-b-2 border-border focus:border-foreground focus:ring-0 font-mono text-2xl py-4 px-3 transition-all text-foreground outline-none"
                                    type="number"
                                    value={localLongBreak}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (!isNaN(val)) setLocalLongBreak(val);
                                    }}
                                  />
                                  <span className="absolute right-3 bottom-4 text-muted-foreground font-mono text-xs pointer-events-none">
                                    MIN
                                  </span>
                                </div>
                              </div>
                            </div>
                          </section>

                          {/* Section: Automation Toggles */}
                          <section className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <label className="flex items-center justify-between p-6 bg-secondary/30 border border-border/50 cursor-pointer hover:border-border transition-colors group">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                  Auto-start Breaks
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Transition automatically after focus
                                </p>
                              </div>
                              <div className="relative">
                                <Switch
                                  checked={localAutoStartBreaks}
                                  onCheckedChange={setLocalAutoStartBreaks}
                                />
                              </div>
                            </label>
                            <label className="flex items-center justify-between p-6 bg-secondary/30 border border-border/50 cursor-pointer hover:border-border transition-colors group">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                  Auto-start Session
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Begin next focus period instantly
                                </p>
                              </div>
                              <div className="relative">
                                <Switch
                                  checked={localAutoStartSession}
                                  onCheckedChange={setLocalAutoStartSession}
                                />
                              </div>
                            </label>
                          </section>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-border bg-secondary/10 flex flex-col md:flex-row gap-4 justify-between items-center mt-auto">
                          <button
                            onClick={() => setIsSettingsOpen(false)}
                            className="w-full md:w-auto px-10 py-4 text-[0.7rem] uppercase tracking-[0.3em] font-mono text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border order-2 md:order-1"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveSettings}
                            className="w-full md:w-auto px-12 py-4 bg-foreground text-background text-[0.7rem] uppercase tracking-[0.3em] font-mono hover:bg-foreground/90 transition-all order-1 md:order-2"
                          >
                            Save Settings
                          </button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
                      <Music className="w-4 h-4" />
                      Soundscapes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar Stats & Apps */}
          <div className="flex flex-col gap-6 h-full">
            <div className="glass-panel p-6 flex flex-col gap-6 rounded-none">
              <h3 className="text-lg font-serif-accent text-foreground border-b border-border pb-3">
                Focus Statistics
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                      Focus Score
                    </span>
                    <span className="text-xs font-bold text-chart-1 bg-chart-1/10 px-2 py-0.5 border border-chart-1/20 rounded-none">
                      +5%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-light text-foreground">
                      84
                    </span>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Excellent focus this week.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                      Session Avg
                    </span>
                    <span className="text-xl font-light text-foreground">
                      42m
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                      Distractions
                    </span>
                    <span className="text-xl font-light text-foreground">
                      3
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 flex-1 flex flex-col rounded-none overflow-hidden">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h3 className="text-lg font-serif-accent text-foreground">
                  Blocked Apps
                </h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-secondary text-foreground border border-border rounded-none">
                  {isFocusActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {blockedAppsList.length === 0 && (
                  <div className="text-center p-4 text-sm text-muted-foreground border border-dashed border-border rounded-none">
                    No apps blocked. Click manage to add apps.
                  </div>
                )}
                {blockedAppsList.map((appName) => {
                  const appInfo = installedApps.find((a) => a.name === appName);
                  return (
                    <div
                      key={appName}
                      className="flex items-center justify-between p-3 border border-border bg-background/50 hover:bg-secondary/50 transition-colors rounded-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 bg-secondary flex items-center justify-center text-muted-foreground rounded-none p-1">
                          <AppIcon
                            appName={appName}
                            iconHint={appInfo?.icon ?? undefined}
                            className="w-full h-full object-contain"
                            shape="rounded-none"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {appName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {appInfo?.categories?.[0] || "App"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveBlockedApp(appName)}
                        disabled={isFocusActive}
                        aria-label={`Remove ${appName} from blocklist`}
                        className="text-muted-foreground hover:text-chart-4 disabled:opacity-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setIsManageOpen(true)}
                disabled={isFocusActive}
                className="w-full mt-4 py-2.5 text-sm font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border rounded-none disabled:opacity-50"
              >
                Manage Blocklist
              </button>

              <ManageBlocklistDialog
                open={isManageOpen}
                onOpenChange={setIsManageOpen}
                isFocusActive={isFocusActive}
                installedApps={installedApps}
                blockedAppsList={blockedAppsList}
                onAddBlockedApp={handleAddBlockedApp}
              />
            </div>
          </div>
        </div>
      </div>
      <FocusSessionNotes
        open={notesOpen}
        onClose={() => {
          setNotesOpen(false);
          reset();
        }}
        durationMinutes={Math.floor(totalTime / 60)}
      />
    </ErrorBoundary>
  );
}
