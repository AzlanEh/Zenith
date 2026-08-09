import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BreakOverlay } from "./components/BreakOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { type Page, Sidebar } from "./components/layout/Sidebar";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { useDarkMode } from "./hooks/useDarkMode";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useUIStore } from "./store/useUIStore";

const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Settings = lazy(() =>
  import("./pages/Settings").then((m) => ({ default: m.Settings })),
);
const FocusMode = lazy(() =>
  import("./pages/FocusMode").then((m) => ({ default: m.FocusMode })),
);
const Analytics = lazy(() =>
  import("./pages/Analytics").then((m) => ({ default: m.Analytics })),
);
const Limits = lazy(() =>
  import("./pages/Limits").then((m) => ({ default: m.Limits })),
);
const Goals = lazy(() =>
  import("./pages/Goals").then((m) => ({ default: m.Goals })),
);

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function App() {
  const [onboarding, setOnboarding] = useState(
    () => localStorage.getItem("onboarding_completed") !== "true",
  );

  const handleOnboardingComplete = useCallback(() => {
    setOnboarding(false);
  }, []);

  const activeTab = useUIStore((state) => state.activeTab);
  const setActiveTab = useUIStore((state) => state.setActiveTab);
  const sidebarOpen = useUIStore((state) => state.mobileSidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen);

  useDarkMode();

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const sidebarHideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSidebarEnter = useCallback(() => {
    clearTimeout(sidebarHideTimer.current);
    setSidebarOpen(true);
  }, [setSidebarOpen]);
  const handleSidebarLeave = useCallback(() => {
    clearTimeout(sidebarHideTimer.current);
    sidebarHideTimer.current = setTimeout(() => setSidebarOpen(false), 500);
  }, [setSidebarOpen]);

  const toggleFocus = useCallback(() => {
    if (activeTab === "focus") return;
    setActiveTab("focus");
  }, [activeTab, setActiveTab]);

  useKeyboardShortcuts(
    setActiveTab,
    () => setShortcutsOpen((v) => !v),
    toggleFocus,
  );

  const headerInfo = useMemo(() => {
    switch (activeTab) {
      case "settings":
        return {
          title: "Settings",
          subtitle: "Manage your account and preferences.",
        };
      case "focus":
        return { title: "Focus Session", subtitle: "Deep work mode active" };
      case "analytics":
        return {
          title: "Detailed Analytics",
          subtitle: "Deep dive into your digital habits",
        };
      case "goals":
        return {
          title: "Goals & Milestones",
          subtitle: "Track your journey to cognitive sovereignty.",
        };
      case "limits":
        return {
          title: "Limits & Blocking",
          subtitle: "Manage your digital diet and restrictions.",
        };
      case "dashboard":
      default: {
        const today = new Date();
        const dateString = today.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
        const day = today.getDate();
        const suffix = ["th", "st", "nd", "rd"][
          day % 10 > 3
            ? 0
            : ((day % 100) - (day % 10) !== 10 ? 1 : 0) * (day % 10)
        ];
        const formattedDate = dateString.replace(/\d+/, day + suffix);

        return { title: "Today's Overview", subtitle: formattedDate };
      }
    }
  }, [activeTab]);

  if (onboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex overflow-hidden selection:bg-chart-1 selection:text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-background focus:text-foreground focus:px-3 focus:py-2 focus:rounded focus:border focus:border-border"
      >
        Skip to main content
      </a>

      <div onMouseLeave={handleSidebarLeave} className="contents">
        <Sidebar
          isOpen={sidebarOpen}
          currentPage={activeTab as Page}
          setCurrentPage={setActiveTab}
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Edge hover zone - opens sidebar on mouse approach (mobile/tablet) */}
      <div
        onMouseEnter={handleSidebarEnter}
        className="fixed left-0 top-0 bottom-0 w-3 z-30 lg:hidden"
      />

      <main
        id="main-content"
        aria-label={`${headerInfo.title} view`}
        className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-background"
      >

        <Suspense fallback={<PageLoader />}>
          <div className="flex-1 flex flex-col">
            {activeTab === "dashboard" && (
              <ErrorBoundary key="dashboard">
                <Dashboard />
              </ErrorBoundary>
            )}
            {activeTab === "settings" && (
              <ErrorBoundary key="settings">
                <Settings />
              </ErrorBoundary>
            )}
            {activeTab === "focus" && (
              <ErrorBoundary key="focus">
                <FocusMode />
              </ErrorBoundary>
            )}
            {activeTab === "goals" && (
              <ErrorBoundary key="goals">
                <Goals />
              </ErrorBoundary>
            )}
            {activeTab === "analytics" && (
              <ErrorBoundary key="analytics">
                <Analytics />
              </ErrorBoundary>
            )}
            {activeTab === "limits" && (
              <ErrorBoundary key="limits">
                <Limits />
              </ErrorBoundary>
            )}
          </div>
        </Suspense>
      </main>

      <BreakOverlay />
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </div>
  );
}

export default App;
