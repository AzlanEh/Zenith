import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppStore } from "./useAppStore";
import { api } from "../services/api";
vi.mock("../services/api", () => ({
  api: {
    getDailyUsage: vi.fn(),
    getWeeklyStats: vi.fn(),
    getHourlyUsage: vi.fn(),
    getWeeklyHourlyUsage: vi.fn(),
    getCategoryUsage: vi.fn(),
    getAppLimits: vi.fn(),
    getBlockedApps: vi.fn(),
    getFocusSettings: vi.fn(),
    getNotificationSettings: vi.fn(),
    setAppLimit: vi.fn(),
    removeAppLimit: vi.fn(),
    setAppCategory: vi.fn(),
    startFocusSession: vi.fn(),
    stopFocusSession: vi.fn(),
    getTheme: vi.fn(),
    setFocusSettings: vi.fn(),
    setNotificationSettings: vi.fn(),
  },
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe("useAppStore - Theme Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads theme successfully", async () => {
    const mockTheme = {
      colors: { primary: "red", secondary: "blue", background: "white", surface: "gray", text: "black", textSecondary: "gray", accent: "purple", warning: "yellow", danger: "red" },
      fonts: { family: "Arial" },
    };

    mockApi.getTheme.mockResolvedValue(mockTheme);

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.loadTheme();
    });

    expect(mockApi.getTheme).toHaveBeenCalledTimes(1);
    expect(result.current.theme).toEqual(mockTheme);
    expect(result.current.loading.theme).toBe(false);
  });

  it("handles theme loading error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi.getTheme.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.loadTheme();
    });

    expect(mockApi.getTheme).toHaveBeenCalledTimes(1);
    expect(result.current.theme?.colors.primary).toBe("oklch(0.9927 0.0364 107.0448)"); // default theme
    expect(result.current.loading.theme).toBe(false);

    consoleError.mockRestore();
  });
});

describe("useAppStore - Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads daily stats successfully", async () => {
    const mockStats = {
      total_seconds: 3600,
      apps: [{ app_name: "Test App", duration_seconds: 1800, session_count: 2, category: "Productivity" }],
    };

    mockApi.getDailyUsage.mockResolvedValue(mockStats);

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.loadDailyStats();
    });

    expect(mockApi.getDailyUsage).toHaveBeenCalledTimes(1);
    expect(result.current.dailyStats).toEqual(mockStats);
    expect(result.current.loading.dailyStats).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("handles daily stats loading error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi.getDailyUsage.mockRejectedValue(new Error("API error"));

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.loadDailyStats();
    });

    expect(mockApi.getDailyUsage).toHaveBeenCalledTimes(1);
    expect(result.current.dailyStats).toBe(null);
    expect(result.current.loading.dailyStats).toBe(false);
    expect(result.current.error).toBe("Error: API error");

    consoleError.mockRestore();
  });

  it("loads weekly stats successfully", async () => {
    const mockStats = {
      days: [{ date: "2024-01-01", timestamp: 1704067200, total_seconds: 3600 }],
      total_seconds: 3600,
    };

    mockApi.getWeeklyStats.mockResolvedValue(mockStats);

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.loadWeeklyStats();
    });

    expect(mockApi.getWeeklyStats).toHaveBeenCalledTimes(1);
    expect(result.current.weeklyStats).toEqual(mockStats);
    expect(result.current.loading.weeklyStats).toBe(false);
  });

  it("loads app limits successfully", async () => {
    const mockLimits = [
      { id: 1, app_id: 1, app_name: "Test App", daily_limit_minutes: 120, block_when_exceeded: true },
    ];

    mockApi.getAppLimits.mockResolvedValue(mockLimits);

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.loadAppLimits();
    });

    expect(mockApi.getAppLimits).toHaveBeenCalledTimes(1);
    expect(result.current.appLimits).toEqual(mockLimits);
    expect(result.current.loading.appLimits).toBe(false);
  });
});

describe("useAppStore - App Limits Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets app limit successfully", async () => {
    mockApi.setAppLimit.mockResolvedValue(undefined);
    mockApi.getAppLimits.mockResolvedValue([]);

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.setAppLimit("Test App", 120, true);
    });

    expect(mockApi.setAppLimit).toHaveBeenCalledWith("Test App", 120, true);
    expect(mockApi.getAppLimits).toHaveBeenCalledTimes(1);
  });

  it("handles set app limit error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi.setAppLimit.mockRejectedValue(new Error("API error"));

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.setAppLimit("Test App", 120, true);
    });

    expect(mockApi.setAppLimit).toHaveBeenCalledWith("Test App", 120, true);
    expect(result.current.error).toBe("Error: API error");

    consoleError.mockRestore();
  });

  it("removes app limit successfully", async () => {
    const mockLimits = [
      { id: 1, app_id: 1, app_name: "Test App", daily_limit_minutes: 120, block_when_exceeded: true },
    ];

    mockApi.removeAppLimit.mockResolvedValue(undefined);
    mockApi.getAppLimits.mockResolvedValue([]);

    const { result } = renderHook(() => useAppStore((state) => ({ ...state, appLimits: mockLimits })));

    const removedData = await act(async () => {
      return await result.current.removeAppLimit("Test App");
    });

    expect(mockApi.removeAppLimit).toHaveBeenCalledWith("Test App");
    expect(mockApi.getAppLimits).toHaveBeenCalledTimes(1);
    expect(removedData).toEqual({
      appName: "Test App",
      minutes: 120,
      blockWhenExceeded: true,
    });
  });

  it("returns null when removing non-existent limit", async () => {
    mockApi.removeAppLimit.mockResolvedValue(undefined);
    mockApi.getAppLimits.mockResolvedValue([]);

    const { result } = renderHook(() => useAppStore());

    const removedData = await act(async () => {
      return await result.current.removeAppLimit("Non-existent App");
    });

    expect(removedData).toBe(null);
  });

  it("gets app limit correctly", () => {
    const mockLimits = [
      { id: 1, app_id: 1, app_name: "Test App", daily_limit_minutes: 120, block_when_exceeded: true },
    ];

    const { result } = renderHook(() => useAppStore((state) => ({ ...state, appLimits: mockLimits })));

    const limit = result.current.getAppLimit("Test App");
    expect(limit).toEqual(mockLimits[0]);
  });

  it("returns undefined for non-existent app limit", () => {
    const { result } = renderHook(() => useAppStore());

    const limit = result.current.getAppLimit("Non-existent App");
    expect(limit).toBeUndefined();
  });
});

describe("useAppStore - Focus Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("starts focus session successfully", async () => {
    mockApi.startFocusSession.mockResolvedValue({
      is_active: true,
      start_time: Date.now(),
      end_time: null,
      duration_minutes: 25,
      minutes_remaining: 25,
      blocked_apps: [],
      is_scheduled: false,
      schedule_name: null,
    });

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.toggleFocusTimer();
    });

    expect(mockApi.startFocusSession).toHaveBeenCalledWith(25);
    expect(result.current.isFocusActive).toBe(true);
    expect(result.current.focusTimeLeft).toBe(25 * 60);
    expect(result.current.focusTotalTime).toBe(25 * 60);
  });

  it("stops focus session successfully", async () => {
    mockApi.stopFocusSession.mockResolvedValue({
      is_active: false,
      start_time: null,
      end_time: Date.now(),
      duration_minutes: 25,
      minutes_remaining: 0,
      blocked_apps: [],
      is_scheduled: false,
      schedule_name: null,
    });

    const { result } = renderHook(() => useAppStore((state) => ({
      ...state,
      isFocusActive: true,
      focusTimeLeft: 1500, // 25 minutes
    })));

    await act(async () => {
      await result.current.toggleFocusTimer();
    });

    expect(mockApi.stopFocusSession).toHaveBeenCalledTimes(1);
    expect(result.current.isFocusActive).toBe(false);
  });

  it("ticks focus timer correctly", () => {
    const { result } = renderHook(() => useAppStore((state) => ({
      ...state,
      isFocusActive: true,
      focusTimeLeft: 60, // 1 minute
    })));

    act(() => {
      result.current.tickFocusTimer();
    });

    expect(result.current.focusTimeLeft).toBe(59);
  });

  it("stops focus when time reaches zero", () => {
    mockApi.stopFocusSession.mockResolvedValue({
      is_active: false,
      start_time: null,
      end_time: Date.now(),
      duration_minutes: 25,
      minutes_remaining: 0,
      blocked_apps: [],
      is_scheduled: false,
      schedule_name: null,
    });

    const { result } = renderHook(() => useAppStore((state) => ({
      ...state,
      isFocusActive: true,
      focusTimeLeft: 0,
    })));

    act(() => {
      result.current.tickFocusTimer();
    });

    expect(mockApi.stopFocusSession).toHaveBeenCalledTimes(1);
    expect(result.current.isFocusActive).toBe(false);
  });

  it("resets focus timer to default duration", async () => {
    mockApi.stopFocusSession.mockResolvedValue({
      is_active: false,
      start_time: null,
      end_time: Date.now(),
      duration_minutes: 25,
      minutes_remaining: 0,
      blocked_apps: [],
      is_scheduled: false,
      schedule_name: null,
    });

    const { result } = renderHook(() => useAppStore((state) => ({
      ...state,
      isFocusActive: true,
      focusTimeLeft: 1500,
      focusSettings: { blocked_apps: [], default_duration_minutes: 30, notify_on_start: true, notify_on_end: true, block_notifications: false, schedules: [] },
    })));

    await act(async () => {
      await result.current.resetFocusTimer();
    });

    expect(mockApi.stopFocusSession).toHaveBeenCalledTimes(1);
    expect(result.current.isFocusActive).toBe(false);
    expect(result.current.focusTimeLeft).toBe(30 * 60); // Uses settings default
    expect(result.current.focusTotalTime).toBe(30 * 60);
  });

  it("resets focus timer to 25 minutes when no settings", async () => {
    mockApi.stopFocusSession.mockResolvedValue({
      is_active: false,
      start_time: null,
      end_time: Date.now(),
      duration_minutes: 25,
      minutes_remaining: 0,
      blocked_apps: [],
      is_scheduled: false,
      schedule_name: null,
    });

    const { result } = renderHook(() => useAppStore((state) => ({
      ...state,
      isFocusActive: true,
      focusTimeLeft: 1500,
      focusSettings: null,
    })));

    await act(async () => {
      await result.current.resetFocusTimer();
    });

    expect(result.current.focusTimeLeft).toBe(25 * 60); // Default fallback
    expect(result.current.focusTotalTime).toBe(25 * 60);
  });
});

describe("useAppStore - UI State Management", () => {
  it("sets active tab correctly", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setActiveTab("analytics");
    });

    expect(result.current.activeTab).toBe("analytics");
  });

  it("toggles sidebar correctly", () => {
    const { result } = renderHook(() => useAppStore());

    expect(result.current.sidebarCollapsed).toBe(false);

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.sidebarCollapsed).toBe(true);

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.sidebarCollapsed).toBe(false);
  });

  it("sets sidebar collapsed state", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setSidebarCollapsed(true);
    });

    expect(result.current.sidebarCollapsed).toBe(true);
  });

  it("sets mobile sidebar open state", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setMobileSidebarOpen(true);
    });

    expect(result.current.mobileSidebarOpen).toBe(true);
  });

  it("computes isLoading correctly", () => {
    const { result } = renderHook(() =>
      useAppStore((state) => ({
        ...state,
        loading: { ...state.loading, dailyStats: true },
      }))
    );

    expect(result.current.isLoading()).toBe(true);
  });

  it("computes isInitialLoad correctly", () => {
    // Initial load (no data)
    const { result: initial } = renderHook(() => useAppStore());
    expect(initial.current.isInitialLoad()).toBe(true);

    // After loading data - need to test with a different hook instance
    const { result: loaded } = renderHook(() =>
      useAppStore((state) => ({
        ...state,
        dailyStats: { total_seconds: 100, apps: [] },
        weeklyStats: { days: [], total_seconds: 0 },
      }))
    );
    expect(loaded.current.isInitialLoad()).toBe(false);
  });
});

describe("useAppStore - Focus Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads focus settings successfully", async () => {
    const mockSettings = {
      blocked_apps: ["app1", "app2"],
      default_duration_minutes: 30,
      notify_on_start: true,
      notify_on_end: false,
      block_notifications: true,
      schedules: [],
    };

    mockApi.getFocusSettings.mockResolvedValue(mockSettings);

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.loadFocusSettings();
    });

    expect(mockApi.getFocusSettings).toHaveBeenCalledTimes(1);
    expect(result.current.focusSettings).toEqual(mockSettings);
  });

  it("updates focus settings successfully", async () => {
    const currentSettings = {
      blocked_apps: ["app1"],
      default_duration_minutes: 25,
      notify_on_start: true,
      notify_on_end: true,
      block_notifications: false,
      schedules: [],
    };

    const updates = { default_duration_minutes: 30, notify_on_start: false };

    mockApi.setFocusSettings.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppStore((state) => ({
      ...state,
      focusSettings: currentSettings,
    })));

    await act(async () => {
      await result.current.updateFocusSettings(updates);
    });

    expect(mockApi.setFocusSettings).toHaveBeenCalledWith({
      ...currentSettings,
      ...updates,
    });
    expect(result.current.focusSettings?.default_duration_minutes).toBe(30);
    expect(result.current.focusSettings?.notify_on_start).toBe(false);
  });

  it("handles focus settings update error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi.setFocusSettings.mockRejectedValue(new Error("API error"));

    const { result } = renderHook(() => useAppStore((state) => ({
      ...state,
      focusSettings: { blocked_apps: [], default_duration_minutes: 25, notify_on_start: true, notify_on_end: true, block_notifications: false, schedules: [] },
    })));

    await act(async () => {
      await result.current.updateFocusSettings({ default_duration_minutes: 30 });
    });

    expect(mockApi.setFocusSettings).toHaveBeenCalledTimes(1);
    // Settings should not change on error
    expect(result.current.focusSettings?.default_duration_minutes).toBe(25);

    consoleError.mockRestore();
  });
});

describe("useAppStore - Notification Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads notification settings successfully", async () => {
    const mockSettings = {
      enabled: true,
      warning_threshold: 80,
      exceeded_threshold: 100,
      dnd_enabled: false,
      dnd_start_hour: 22,
      dnd_end_hour: 8,
    };

    mockApi.getNotificationSettings.mockResolvedValue(mockSettings);

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.loadNotificationSettings();
    });

    expect(mockApi.getNotificationSettings).toHaveBeenCalledTimes(1);
    expect(result.current.notificationSettings).toEqual(mockSettings);
  });

  it("updates notification settings successfully", async () => {
    const currentSettings = {
      enabled: true,
      warning_threshold: 80,
      exceeded_threshold: 100,
      dnd_enabled: false,
      dnd_start_hour: 22,
      dnd_end_hour: 8,
    };

    const updates = { enabled: false, warning_threshold: 90 };

    mockApi.setNotificationSettings.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppStore((state) => ({
      ...state,
      notificationSettings: currentSettings,
    })));

    await act(async () => {
      await result.current.updateNotificationSettings(updates);
    });

    expect(mockApi.setNotificationSettings).toHaveBeenCalledWith({
      ...currentSettings,
      ...updates,
    });
    expect(result.current.notificationSettings?.enabled).toBe(false);
    expect(result.current.notificationSettings?.warning_threshold).toBe(90);
  });
});

describe("useAppStore - Refresh All", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock all API calls to resolve
    Object.values(mockApi).forEach((mock: any) => {
      if (typeof mock === 'function') {
        mock.mockResolvedValue({} as any);
      }
    });
  });

  it("refreshes all data successfully", async () => {
    // Mock all API calls to resolve with appropriate values
    mockApi.getDailyUsage.mockResolvedValue({ total_seconds: 0, apps: [] });
    mockApi.getWeeklyStats.mockResolvedValue({ days: [], total_seconds: 0 });
    mockApi.getHourlyUsage.mockResolvedValue([]);
    mockApi.getWeeklyHourlyUsage.mockResolvedValue([]);
    mockApi.getCategoryUsage.mockResolvedValue([]);
    mockApi.getAppLimits.mockResolvedValue([]);
    mockApi.getBlockedApps.mockResolvedValue([]);
    mockApi.getFocusSettings.mockResolvedValue({
      blocked_apps: [],
      default_duration_minutes: 25,
      notify_on_start: true,
      notify_on_end: true,
      block_notifications: false,
      schedules: [],
    });
    mockApi.getNotificationSettings.mockResolvedValue({
      enabled: true,
      warning_threshold: 80,
      exceeded_threshold: 100,
      dnd_enabled: false,
      dnd_start_hour: 22,
      dnd_end_hour: 8,
    });

    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.refreshAll();
    });

    expect(mockApi.getDailyUsage).toHaveBeenCalledTimes(1);
    expect(mockApi.getWeeklyStats).toHaveBeenCalledTimes(1);
    expect(mockApi.getHourlyUsage).toHaveBeenCalledTimes(1);
    expect(mockApi.getWeeklyHourlyUsage).toHaveBeenCalledTimes(1);
    expect(mockApi.getCategoryUsage).toHaveBeenCalledTimes(1);
    expect(mockApi.getAppLimits).toHaveBeenCalledTimes(1);
    expect(mockApi.getBlockedApps).toHaveBeenCalledTimes(1);
    expect(mockApi.getFocusSettings).toHaveBeenCalledTimes(1);
    expect(mockApi.getNotificationSettings).toHaveBeenCalledTimes(1);
  });
});