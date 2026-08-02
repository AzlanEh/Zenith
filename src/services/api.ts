import { invoke } from "@tauri-apps/api/core";
import type {
  DailyStats,
  WeeklyStats,
  AppLimit,
  App,
  HourlyUsage,
  InstalledApp,
  AutostartStatus,
  ExportRecord,
  BreakSettings,
  BreakStatus,
  FocusNote,
  HistoricalData,
  NotificationSettings,
  FocusSettings,
  FocusSession,
  Goal,
  GoalProgress,
  Achievement,
  GoalsStats,
  WeeklyHourlyUsage,
} from "../types";

const invokeApi = <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> =>
  invoke<T>(cmd, args);

export const api = {
  getDailyUsage: (): Promise<DailyStats> => invokeApi("get_daily_usage"),

  getWeeklyStats: (): Promise<WeeklyStats> => invokeApi("get_weekly_stats"),

  setAppLimit: (appName: string, minutes: number, blockWhenExceeded?: boolean): Promise<void> =>
    invokeApi("set_app_limit", { appName, minutes, blockWhenExceeded }),

  getAppLimits: (): Promise<AppLimit[]> => invokeApi("get_app_limits"),

  removeAppLimit: (appName: string): Promise<void> => invokeApi("remove_app_limit", { appName }),

  getAllApps: (): Promise<App[]> => invokeApi("get_all_apps"),

  recordUsage: (appName: string, durationSeconds: number): Promise<void> =>
    invokeApi("record_usage", { appName, durationSeconds }),

  getHourlyUsage: (): Promise<HourlyUsage[]> => invokeApi("get_hourly_usage"),

  getWeeklyHourlyUsage: (): Promise<WeeklyHourlyUsage[]> => invokeApi("get_weekly_hourly_usage"),

  setAppCategory: (appName: string, category: string): Promise<void> =>
    invokeApi("set_app_category", { appName, category }),

  checkAppBlocked: (appName: string): Promise<boolean> => invokeApi("check_app_blocked", { appName }),

  getBlockedApps: (): Promise<string[]> => invokeApi("get_blocked_apps"),

  grantEmergencyAccess: (appName: string): Promise<number> => invokeApi("grant_emergency_access", { appName }),

  getEmergencyAccessRemaining: (appName: string): Promise<number> => invokeApi("get_emergency_access_remaining", { appName }),

  hasEmergencyAccess: (appName: string): Promise<boolean> => invokeApi("has_emergency_access", { appName }),

  quitBlockedApp: (appName: string): Promise<void> => invokeApi("quit_blocked_app", { appName }),

  getInstalledApps: (): Promise<InstalledApp[]> => invokeApi("get_installed_apps"),

  resolveAppIcon: (iconName: string): Promise<string | null> => invokeApi("resolve_app_icon", { iconName }),

  sendTestNotification: (): Promise<void> => invokeApi("send_test_notification"),

  enableAutostart: (): Promise<string> => invokeApi("enable_autostart"),

  disableAutostart: (): Promise<string> => invokeApi("disable_autostart"),

  getAutostartStatus: (): Promise<AutostartStatus> => invokeApi("get_autostart_status"),

  exportUsageData: (startDate: string, endDate: string): Promise<ExportRecord[]> => invokeApi("export_usage_data", { startDate, endDate }),

  importUsageData: (records: ExportRecord[]): Promise<number> => invokeApi("import_usage_data", { records }),

  saveExportFile: (filePath: string, content: string): Promise<void> => invokeApi("save_export_file", { filePath, content }),

  minimizeToTray: (): Promise<void> => invokeApi("minimize_to_tray"),

  showWindow: (): Promise<void> => invokeApi("show_window"),

  getBreakSettings: (): Promise<BreakSettings> => invokeApi("get_break_settings"),

  setBreakSettings: (settings: BreakSettings): Promise<void> => invokeApi("set_break_settings", { settings }),

  getBreakStatus: (): Promise<BreakStatus> => invokeApi("get_break_status"),

  startBreak: (): Promise<void> => invokeApi("start_break"),

  endBreak: (): Promise<void> => invokeApi("end_break"),

  resetBreakTimer: (): Promise<void> => invokeApi("reset_break_timer"),

  getHistoricalData: (startDate: string, endDate: string): Promise<HistoricalData> => invokeApi("get_historical_data", { startDate, endDate }),

  getNotificationSettings: (): Promise<NotificationSettings> => invokeApi("get_notification_settings"),

  setNotificationSettings: (settings: NotificationSettings): Promise<void> => invokeApi("set_notification_settings", { settings }),

  muteNotifications: (): Promise<void> => invokeApi("mute_notifications"),

  unmuteNotifications: (): Promise<void> => invokeApi("unmute_notifications"),

  isNotificationsMuted: (): Promise<boolean> => invokeApi("is_notifications_muted"),

  getFocusSettings: (): Promise<FocusSettings> => invokeApi("get_focus_settings"),

  setFocusSettings: (settings: FocusSettings): Promise<void> => invokeApi("set_focus_settings", { settings }),

  getFocusSession: (): Promise<FocusSession> => invokeApi("get_focus_session"),

  startFocusSession: (durationMinutes?: number, blockedApps?: string[]): Promise<FocusSession> => invokeApi("start_focus_session", { durationMinutes, blockedApps }),

  stopFocusSession: (): Promise<FocusSession> => invokeApi("stop_focus_session"),

  extendFocusSession: (additionalMinutes: number): Promise<FocusSession | null> => invokeApi("extend_focus_session", { additionalMinutes }),

  isFocusModeActive: (): Promise<boolean> => invokeApi("is_focus_mode_active"),

  shouldBlockAppFocus: (appName: string): Promise<boolean> => invokeApi("should_block_app_focus", { appName }),

  addFocusBlockedApp: (appName: string): Promise<void> => invokeApi("add_focus_blocked_app", { appName }),

  removeFocusBlockedApp: (appName: string): Promise<void> => invokeApi("remove_focus_blocked_app", { appName }),

  getGoals: (): Promise<Goal[]> => invokeApi("get_goals"),

  addGoal: (goal: Goal): Promise<void> => invokeApi("add_goal", { goal }),

  updateGoal: (goal: Goal): Promise<void> => invokeApi("update_goal", { goal }),

  getGoalsProgress: (): Promise<GoalProgress[]> => invokeApi("get_goals_progress"),

  getAchievements: (): Promise<Achievement[]> => invokeApi("get_achievements"),

  getGoalsStats: (): Promise<GoalsStats> => invokeApi("get_goals_stats"),

  saveFocusNote: (content: string, durationMinutes: number): Promise<number> =>
    invokeApi("save_focus_note", { content, durationMinutes }),

  getFocusNotes: (): Promise<FocusNote[]> => invokeApi("get_focus_notes"),

  initOnboardingGoals: (dailyGoalMinutes: number, screenLimitHours: number, mindfulnessSessions: number): Promise<void> =>
    invokeApi("init_onboarding_goals", { dailyGoalMinutes, screenLimitHours, mindfulnessSessions }),

  wipeAllData: (confirmationText: string): Promise<void> => invokeApi("wipe_all_data", { confirmationText }),
};
