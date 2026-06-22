import type {
  Theme,
  DailyStats,
  WeeklyStats,
  AppLimit,
  App,
  HourlyUsage,
  CategoryUsage,
  InstalledApp,
  AutostartStatus,
  ExportRecord,
  BreakSettings,
  BreakStatus,
  HistoricalData,
  NotificationSettings,
  FocusSettings,
  FocusSession,
  Goal,
  GoalProgress,
  Achievement,
  GoalsStats,
  WeeklyHourlyUsage,
  AppUsage,
  DayStats,
} from "@/types";

let _id = 0;
export function resetId() { _id = 0; }
function nextId() { return ++_id; }

export function buildTheme(overrides?: Partial<Theme>): Theme {
  return {
    colors: {
      primary: "oklch(0.9927 0.0364 107.0448)",
      secondary: "oklch(0.6278 0.2577 29.23)",
      background: "oklch(1 0 0)",
      surface: "oklch(0.97 0 0)",
      text: "oklch(0.145 0 0)",
      textSecondary: "oklch(0.556 0 0)",
      accent: "oklch(0.558 0.288 302.32)",
      warning: "oklch(0.795 0.184 86.04)",
      danger: "oklch(0.637 0.237 25.33)",
    },
    fonts: { family: "system-ui" },
    ...overrides,
  };
}

export function buildAppUsage(overrides?: Partial<AppUsage>): AppUsage {
  return {
    app_name: "Test App",
    duration_seconds: 1800,
    session_count: 2,
    category: "Productivity",
    ...overrides,
  };
}

export function buildDailyStats(overrides?: Partial<DailyStats>): DailyStats {
  return {
    total_seconds: 3600,
    apps: [buildAppUsage()],
    ...overrides,
  };
}

export function buildDayStats(overrides?: Partial<DayStats>): DayStats {
  return {
    date: "2026-01-12",
    timestamp: 1768132800,
    total_seconds: 3600,
    ...overrides,
  };
}

export function buildWeeklyStats(overrides?: Partial<WeeklyStats>): WeeklyStats {
  return {
    days: [buildDayStats()],
    total_seconds: 3600,
    ...overrides,
  };
}

export function buildAppLimit(overrides?: Partial<AppLimit>): AppLimit {
  return {
    id: nextId(),
    app_id: 1,
    app_name: "Test App",
    daily_limit_minutes: 120,
    block_when_exceeded: true,
    ...overrides,
  };
}

export function buildApp(overrides?: Partial<App>): App {
  return {
    id: nextId(),
    name: "Test App",
    path: "/usr/bin/test",
    icon_path: null,
    category: "Productivity",
    is_blocked: false,
    created_at: 1768132800,
    ...overrides,
  };
}

export function buildHourlyUsage(overrides?: Partial<HourlyUsage>): HourlyUsage {
  return {
    hour: 9,
    total_seconds: 3600,
    ...overrides,
  };
}

export function buildWeeklyHourlyUsage(overrides?: Partial<WeeklyHourlyUsage>): WeeklyHourlyUsage {
  return {
    date: "2026-01-12",
    hour: 9,
    total_seconds: 3600,
    ...overrides,
  };
}

export function buildCategoryUsage(overrides?: Partial<CategoryUsage>): CategoryUsage {
  return {
    category: "Productivity",
    total_seconds: 3600,
    app_count: 3,
    ...overrides,
  };
}

export function buildInstalledApp(overrides?: Partial<InstalledApp>): InstalledApp {
  return {
    name: "Test App",
    exec: "/usr/bin/test",
    icon: null,
    desktop_file: "test.desktop",
    categories: ["Utility"],
    ...overrides,
  };
}

export function buildAutostartStatus(overrides?: Partial<AutostartStatus>): AutostartStatus {
  return {
    enabled: true,
    systemd_installed: true,
    systemd_running: true,
    xdg_installed: false,
    ...overrides,
  };
}

export function buildExportRecord(overrides?: Partial<ExportRecord>): ExportRecord {
  return {
    date: "2026-01-12",
    app_name: "Test App",
    category: "Productivity",
    duration_seconds: 1800,
    session_count: 2,
    ...overrides,
  };
}

export function buildBreakSettings(overrides?: Partial<BreakSettings>): BreakSettings {
  return {
    enabled: true,
    work_minutes: 25,
    break_minutes: 5,
    show_notification: true,
    play_sound: false,
    ...overrides,
  };
}

export function buildBreakStatus(overrides?: Partial<BreakStatus>): BreakStatus {
  return {
    enabled: true,
    minutes_worked: 15,
    work_minutes: 25,
    is_on_break: false,
    ...overrides,
  };
}

export function buildHistoricalData(overrides?: Partial<HistoricalData>): HistoricalData {
  return {
    daily_totals: [buildDayStats()],
    app_usage: [buildAppUsage()],
    category_usage: [buildCategoryUsage()],
    total_seconds: 3600,
    ...overrides,
  };
}

export function buildNotificationSettings(overrides?: Partial<NotificationSettings>): NotificationSettings {
  return {
    enabled: true,
    warning_threshold: 80,
    exceeded_threshold: 100,
    dnd_enabled: false,
    dnd_start_hour: 22,
    dnd_end_hour: 8,
    ...overrides,
  };
}

export function buildFocusSettings(overrides?: Partial<FocusSettings>): FocusSettings {
  return {
    blocked_apps: [],
    default_duration_minutes: 25,
    notify_on_start: true,
    notify_on_end: true,
    block_notifications: false,
    schedules: [],
    ...overrides,
  };
}

export function buildFocusSession(overrides?: Partial<FocusSession>): FocusSession {
  return {
    is_active: false,
    start_time: null,
    end_time: null,
    duration_minutes: null,
    minutes_remaining: null,
    blocked_apps: [],
    is_scheduled: false,
    schedule_name: null,
    ...overrides,
  };
}

export function buildGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: `goal-${nextId()}`,
    name: "Test Goal",
    goal_type: { daily_limit: {} },
    target_minutes: 120,
    days: [],
    enabled: true,
    created_at: "2026-01-12T00:00:00Z",
    ...overrides,
  };
}

export function buildGoalProgress(overrides?: Partial<GoalProgress>): GoalProgress {
  return {
    goal_id: `goal-${nextId()}`,
    goal_name: "Test Goal",
    goal_type: { daily_limit: {} },
    target_minutes: 120,
    current_minutes: 60,
    progress_percent: 50,
    is_met: false,
    status: "on_track",
    ...overrides,
  };
}

export function buildAchievement(overrides?: Partial<Achievement>): Achievement {
  return {
    id: `ach-${nextId()}`,
    name: "Test Achievement",
    description: "A test achievement",
    icon: "trophy",
    earned_at: null,
    progress: 5,
    target: 10,
    ...overrides,
  };
}

export function buildGoalsStats(overrides?: Partial<GoalsStats>): GoalsStats {
  return {
    current_streak: 0,
    longest_streak: 5,
    total_goals_met: 10,
    focus_sessions_completed: 25,
    ...overrides,
  };
}
