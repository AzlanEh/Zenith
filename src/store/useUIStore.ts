import { create } from "zustand";

type Tab = "dashboard" | "analytics" | "focus" | "goals" | "limits" | "settings";

interface UIState {
  activeTab: Tab;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  setActiveTab: (tab: Tab) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: "dashboard",
  sidebarCollapsed: false,
  mobileSidebarOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileSidebarOpen: (open: boolean) => set({ mobileSidebarOpen: open }),
}));