import { useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useAppStore } from "./store/useAppStore";
import { useDarkMode } from "./hooks/useDarkMode";

import { Sidebar, Page } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const FocusMode = lazy(() => import('./pages/FocusMode').then(m => ({ default: m.FocusMode })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Limits = lazy(() => import('./pages/Limits').then(m => ({ default: m.Limits })));

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function App() {
  const activeTab = useAppStore(state => state.activeTab);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const sidebarOpen = useAppStore(state => state.mobileSidebarOpen);
  const setSidebarOpen = useAppStore(state => state.setMobileSidebarOpen);
  const isFocusActive = useAppStore(state => state.isFocusActive);
  const tickFocusTimer = useAppStore(state => state.tickFocusTimer);

  useDarkMode();

  useEffect(() => {
    let interval: number | undefined;
    if (isFocusActive) {
      interval = window.setInterval(() => {
        tickFocusTimer();
      }, 1000);
    }
    return () => {
      if (interval !== undefined) clearInterval(interval);
    };
  }, [isFocusActive, tickFocusTimer]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [setSidebarOpen, sidebarOpen]);

  const headerInfo = useMemo(() => {
    switch(activeTab) {
      case 'settings':
        return { title: "Settings", subtitle: "Manage your account and preferences." };
      case 'focus':
        return { title: "Focus Session", subtitle: "Deep work mode active" };
      case 'analytics':
        return { title: "Detailed Analytics", subtitle: "Deep dive into your digital habits" };
      case 'limits':
        return { title: "Limits & Blocking", subtitle: "Manage your digital diet and restrictions." };
      case 'dashboard':
      default: {
        const today = new Date();
        const dateString = today.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        const day = today.getDate();
        const suffix = ['th', 'st', 'nd', 'rd'][(day % 10 > 3 ? 0 : (day % 100 - day % 10 !== 10 ? 1 : 0) * (day % 10))];
        const formattedDate = dateString.replace(/\d+/, day + suffix);
        
        return { title: "Today's Overview", subtitle: formattedDate };
      }
    }
  }, [activeTab]);

  return (
    <div className="bg-background text-foreground min-h-screen flex overflow-hidden selection:bg-chart-1 selection:text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-background focus:text-foreground focus:px-3 focus:py-2 focus:rounded focus:border focus:border-border"
      >
        Skip to main content
      </a>

      <Sidebar 
        isOpen={sidebarOpen} 
        currentPage={activeTab as Page}
        setCurrentPage={setActiveTab}
      />
      
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main
        id="main-content"
        aria-label={`${headerInfo.title} view`}
        className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-background"
      >
        <Header 
          toggleSidebar={toggleSidebar} 
          sidebarOpen={sidebarOpen}
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
        />
        
        <Suspense fallback={<PageLoader />}>
          <div className="flex-1 flex flex-col">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'settings' && <Settings />}
            {activeTab === 'focus' && <FocusMode />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'limits' && <Limits />}
          </div>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
