import { create } from "zustand";
import { toast } from "sonner";
import type { Theme, DailyStats, WeeklyStats, AppLimit, HourlyUsage, CategoryUsage, FocusSettings, NotificationSettings, WeeklyHourlyUsage } from "../types";
import { api } from "../services/api";

const pendingRequests = new Map<string, Promise<void>>();

interface LoadingState {
  theme: boolean;
  dailyStats: boolean;
  weeklyStats: boolean;
  hourlyUsage: boolean;
  weeklyHourlyUsage: boolean;
  categoryUsage: boolean;
  appLimits: boolean;
  blockedApps: boolean;
}

// Data needed to restore a removed limit
export interface RemovedLimitData {
  appName: string;
  minutes: number;
  blockWhenExceeded: boolean;
}

// Data needed to restore a category change
export interface CategoryChangeData {
  appName: string;
  previousCategory: string | null;
}

interface AppState {
  theme: Theme | null;
  dailyStats: DailyStats | null;
  weeklyStats: WeeklyStats | null;
  hourlyUsage: HourlyUsage[];
  weeklyHourlyUsage: WeeklyHourlyUsage[];
  categoryUsage: CategoryUsage[];
  appLimits: AppLimit[];
  blockedApps: string[];
  loading: LoadingState;
  error: string | null;
  activeTab: "dashboard" | "analytics" | "focus" | "limits" | "settings";
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;

  // Global frontend timer state
  isFocusActive: boolean;
  focusTimeLeft: number;
  focusTotalTime: number;
  setIsFocusActive: (active: boolean) => void;
  setFocusTimeLeft: (time: number) => void;
  setFocusTotalTime: (time: number) => void;
  toggleFocusTimer: () => void;
  resetFocusTimer: () => void;
  tickFocusTimer: () => void;

  // Computed helper for backwards compatibility
  isLoading: () => boolean;
  isInitialLoad: () => boolean;

  // Focus and Notification Settings
  focusSettings: FocusSettings | null;
  notificationSettings: NotificationSettings | null;
  loadFocusSettings: () => Promise<void>;
  loadNotificationSettings: () => Promise<void>;
  updateFocusSettings: (settings: Partial<FocusSettings>) => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;

  setActiveTab: (tab: "dashboard" | "analytics" | "focus" | "limits" | "settings") => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  loadTheme: () => Promise<void>;
  loadDailyStats: () => Promise<void>;
  loadWeeklyStats: () => Promise<void>;
  loadHourlyUsage: () => Promise<void>;
  loadWeeklyHourlyUsage: () => Promise<void>;
  loadCategoryUsage: () => Promise<void>;
  loadAppLimits: () => Promise<void>;
  loadBlockedApps: () => Promise<void>;
  setAppLimit: (appName: string, minutes: number, blockWhenExceeded?: boolean) => Promise<void>;
  removeAppLimit: (appName: string) => Promise<RemovedLimitData | null>;
  setAppCategory: (appName: string, category: string) => Promise<CategoryChangeData | null>;
  // Silent versions for undo (no toasts)
  setAppLimitSilent: (appName: string, minutes: number, blockWhenExceeded?: boolean) => Promise<void>;
  setAppCategorySilent: (appName: string, category: string) => Promise<void>;
  // Helper to get limit data before removal
  getAppLimit: (appName: string) => AppLimit | undefined;
  // Helper to get current category
  getAppCategory: (appName: string) => string | null;
  refreshAll: () => Promise<void>;
}

const defaultTheme: Theme = {
  colors: {
    primary: "oklch(0.9927 0.0364 107.0448)",
    secondary: "oklch(0.4856 0.0171 107.0202)",
    background: "oklch(0.1722 0.0041 106.8174)",
    surface: "oklch(0.1722 0.0041 106.8174)",
    text: "oklch(0.9927 0.0364 107.0448)",
    textSecondary: "oklch(0.6357 0.0218 107.0046)",
    accent: "oklch(0.6357 0.0218 107.0046)",
    warning: "oklch(0.6344 0.1550 50.2665)",
    danger: "oklch(0.6368 0.2078 25.3313)",
  },
  fonts: {
    family: "Inter, sans-serif",
  },
};

const initialLoadingState: LoadingState = {
  theme: false,
  dailyStats: false,
  weeklyStats: false,
  hourlyUsage: false,
  weeklyHourlyUsage: false,
  categoryUsage: false,
  appLimits: false,
  blockedApps: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  theme: defaultTheme,
  dailyStats: null,
  weeklyStats: null,
  hourlyUsage: [],
  weeklyHourlyUsage: [],
  categoryUsage: [],
  appLimits: [],
  blockedApps: [],
  loading: { ...initialLoadingState },
  error: null,
  activeTab: "dashboard",
  sidebarCollapsed: false,
  mobileSidebarOpen: false,

  focusSettings: null,
  notificationSettings: null,

  // Global frontend timer state implementation
  isFocusActive: false,
  focusTimeLeft: 25 * 60,
  focusTotalTime: 25 * 60,
  
  setIsFocusActive: (active) => set({ isFocusActive: active }),
  setFocusTimeLeft: (time) => set({ focusTimeLeft: time }),
  setFocusTotalTime: (time) => set({ focusTotalTime: time }),
  toggleFocusTimer: async () => {
    const state = get();
    if (state.isFocusActive) {
      // Stopping
      try {
        await api.stopFocusSession();
        set({ isFocusActive: false });
        toast.success("Focus mode ended");
      } catch (e) {
        console.error("Failed to stop focus session", e);
      }
    } else {
      // Starting
      try {
        const durationMins = Math.ceil(state.focusTimeLeft / 60);
        await api.startFocusSession(durationMins);
        set({ isFocusActive: true, focusTotalTime: state.focusTimeLeft });
        toast.success(`Focus mode started for ${durationMins} minutes`);
      } catch (e) {
        console.error("Failed to start focus session", e);
        toast.error("Failed to start focus session. Have you added apps to block?");
      }
    }
  },
  resetFocusTimer: async () => {
    const state = get();
    if (state.isFocusActive) {
      try {
        await api.stopFocusSession();
      } catch(e) {
        console.error(e);
      }
    }
    const defaultMins = state.focusSettings?.default_duration_minutes || 25;
    set({ isFocusActive: false, focusTimeLeft: defaultMins * 60, focusTotalTime: defaultMins * 60 });
  },
  tickFocusTimer: () => set((state) => {
    if (state.isFocusActive && state.focusTimeLeft > 0) {
      return { focusTimeLeft: state.focusTimeLeft - 1 };
    }
    if (state.focusTimeLeft === 0 && state.isFocusActive) {
      // Time's up
      api.stopFocusSession().catch(console.error);
      return { isFocusActive: false };
    }
    return state;
  }),

  // Computed: true if ANY loading operation is in progress
  isLoading: () => {
    const { loading } = get();
    return Object.values(loading).some(Boolean);
  },

  // Check if this is the initial load (no data yet)
  isInitialLoad: () => {
    const state = get();
    return state.dailyStats === null && state.weeklyStats === null;
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  loadTheme: async () => {
    try {
      set((state) => ({ loading: { ...state.loading, theme: true } }));
      const theme = await api.getTheme();
      set((state) => ({ theme, loading: { ...state.loading, theme: false } }));
    } catch (error) {
      console.error("Failed to load theme:", error);
      set((state) => ({ theme: defaultTheme, loading: { ...state.loading, theme: false } }));
    }
  },

  loadDailyStats: async () => {
    const pending = pendingRequests.get("dailyStats");
    if (pending) return pending;

    const request = (async () => {
      try {
        const dailyStats = await api.getDailyUsage();
        set({ dailyStats, error: null });
      } catch (error) {
        console.error("Failed to load daily stats:", error);
        set({ error: String(error), dailyStats: null });
      }
    })();
    pendingRequests.set("dailyStats", request);
    return request;
  },

  loadWeeklyStats: async () => {
    const pending = pendingRequests.get("weeklyStats");
    if (pending) return pending;

    const request = (async () => {
      try {
        const weeklyStats = await api.getWeeklyStats();
        set({ weeklyStats, error: null });
      } catch (error) {
        console.error("Failed to load weekly stats:", error);
        set({ error: String(error) });
      }
    })();
    pendingRequests.set("weeklyStats", request);
    return request;
  },

  loadHourlyUsage: async () => {
    const pending = pendingRequests.get("hourlyUsage");
    if (pending) return pending;

    const request = (async () => {
      try {
        const hourlyUsage = await api.getHourlyUsage();
        set({ hourlyUsage });
      } catch (error) {
        console.error("Failed to load hourly usage:", error);
      }
    })();
    pendingRequests.set("hourlyUsage", request);
    return request;
  },

  loadWeeklyHourlyUsage: async () => {
    const pending = pendingRequests.get("weeklyHourlyUsage");
    if (pending) return pending;

    const request = (async () => {
      try {
        const weeklyHourlyUsage = await api.getWeeklyHourlyUsage();
        set({ weeklyHourlyUsage });
      } catch (error) {
        console.error("Failed to load weekly hourly usage:", error);
      }
    })();
    pendingRequests.set("weeklyHourlyUsage", request);
    return request;
  },

  loadCategoryUsage: async () => {
    const pending = pendingRequests.get("categoryUsage");
    if (pending) return pending;

    const request = (async () => {
      try {
        const categoryUsage = await api.getCategoryUsage();
        set({ categoryUsage });
      } catch (error) {
        console.error("Failed to load category usage:", error);
      }
    })();
    pendingRequests.set("categoryUsage", request);
    return request;
  },

  loadAppLimits: async () => {
    const pending = pendingRequests.get("appLimits");
    if (pending) return pending;

    const request = (async () => {
      try {
        const appLimits = await api.getAppLimits();
        set({ appLimits });
      } catch (error) {
        console.error("Failed to load app limits:", error);
      }
    })();
    pendingRequests.set("appLimits", request);
    return request;
  },

  loadBlockedApps: async () => {
    const pending = pendingRequests.get("blockedApps");
    if (pending) return pending;

    const request = (async () => {
      try {
        const blockedApps = await api.getBlockedApps();
        set({ blockedApps });
      } catch (error) {
        console.error("Failed to load blocked apps:", error);
      }
    })();
    pendingRequests.set("blockedApps", request);
    return request;
  },

  loadFocusSettings: async () => {
    try {
      const settings = await api.getFocusSettings();
      set({ focusSettings: settings });
    } catch (error) {
      console.error("Failed to load focus settings:", error);
    }
  },

  loadNotificationSettings: async () => {
    try {
      const settings = await api.getNotificationSettings();
      set({ notificationSettings: settings });
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  },

  updateFocusSettings: async (updates) => {
    try {
      const current = get().focusSettings;
      if (!current) return;
      const next = { ...current, ...updates };
      await api.setFocusSettings(next);
      set({ focusSettings: next });
      toast.success("Focus settings updated");
    } catch (error) {
      console.error("Failed to update focus settings:", error);
      toast.error("Failed to update focus settings");
    }
  },

  updateNotificationSettings: async (updates) => {
    try {
      const current = get().notificationSettings;
      if (!current) return;
      const next = { ...current, ...updates };
      await api.setNotificationSettings(next);
      set({ notificationSettings: next });
      toast.success("Notification settings updated");
    } catch (error) {
      console.error("Failed to update notification settings:", error);
      toast.error("Failed to update notification settings");
    }
  },

  setAppLimit: async (appName, minutes, blockWhenExceeded = false) => {
    try {
      await api.setAppLimit(appName, minutes, blockWhenExceeded);
      await get().loadAppLimits();
      toast.success(`Limit set for ${appName}`, {
        description: `${minutes} minutes daily limit`,
      });
    } catch (error) {
      console.error("Failed to set app limit:", error);
      toast.error("Failed to set app limit", {
        description: String(error),
      });
      set({ error: String(error) });
    }
  },

  removeAppLimit: async (appName) => {
    // Get limit data before removal for undo
    const limit = get().appLimits.find(
      (l) => l.app_name.toLowerCase() === appName.toLowerCase()
    );
    
    if (!limit) {
      toast.error("Limit not found");
      return null;
    }

    const removedData: RemovedLimitData = {
      appName: limit.app_name,
      minutes: limit.daily_limit_minutes,
      blockWhenExceeded: limit.block_when_exceeded,
    };

    try {
      await api.removeAppLimit(appName);
      await get().loadAppLimits();
      // Return the data for undo - toast handled by component
      return removedData;
    } catch (error) {
      console.error("Failed to remove app limit:", error);
      toast.error("Failed to remove app limit", {
        description: String(error),
      });
      set({ error: String(error) });
      return null;
    }
  },

  setAppCategory: async (appName, category) => {
    // Get previous category for undo
    const app = get().dailyStats?.apps.find(
      (a) => a.app_name.toLowerCase() === appName.toLowerCase()
    );
    const previousCategory = app?.category || null;

    const changeData: CategoryChangeData = {
      appName,
      previousCategory,
    };

    try {
      await api.setAppCategory(appName, category);
      await get().loadDailyStats();
      await get().loadCategoryUsage();
      // Return the data for undo - toast handled by component
      return changeData;
    } catch (error) {
      console.error("Failed to set app category:", error);
      toast.error("Failed to set category", {
        description: String(error),
      });
      set({ error: String(error) });
      return null;
    }
  },

  // Silent versions for undo operations (no toasts)
  setAppLimitSilent: async (appName, minutes, blockWhenExceeded = false) => {
    try {
      await api.setAppLimit(appName, minutes, blockWhenExceeded);
      await get().loadAppLimits();
    } catch (error) {
      console.error("Failed to set app limit:", error);
      throw error;
    }
  },

  setAppCategorySilent: async (appName, category) => {
    try {
      await api.setAppCategory(appName, category);
      await get().loadDailyStats();
      await get().loadCategoryUsage();
    } catch (error) {
      console.error("Failed to set app category:", error);
      throw error;
    }
  },

  // Helper to get current limit data
  getAppLimit: (appName) => {
    return get().appLimits.find(
      (l) => l.app_name.toLowerCase() === appName.toLowerCase()
    );
  },

  // Helper to get current category
  getAppCategory: (appName) => {
    const app = get().dailyStats?.apps.find(
      (a) => a.app_name.toLowerCase() === appName.toLowerCase()
    );
    return app?.category || null;
  },

  refreshAll: async () => {
    const { 
      loadDailyStats, 
      loadWeeklyStats, 
      loadHourlyUsage, 
      loadWeeklyHourlyUsage,
      loadCategoryUsage, 
      loadAppLimits, 
      loadBlockedApps,
      loadFocusSettings,
      loadNotificationSettings
    } = get();
    
    await Promise.all([
      loadDailyStats(),
      loadWeeklyStats(),
      loadHourlyUsage(),
      loadWeeklyHourlyUsage(),
      loadCategoryUsage(),
      loadAppLimits(),
      loadBlockedApps(),
      loadFocusSettings(),
      loadNotificationSettings()
    ]);
  },
}));
