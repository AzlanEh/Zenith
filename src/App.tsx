import { useState, useEffect } from "react";
import { Download, Save } from "lucide-react";
import { useAppStore } from "./store/useAppStore";

import { Sidebar, Page } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { FocusMode } from './pages/FocusMode';
import { Analytics } from './pages/Analytics';
import { Limits } from './pages/Limits';

function App() {
  const [isDark, setIsDark] = useState(false);
  const activeTab = useAppStore(state => state.activeTab);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const sidebarOpen = useAppStore(state => state.mobileSidebarOpen);
  const setSidebarOpen = useAppStore(state => state.setMobileSidebarOpen);
  const isFocusActive = useAppStore(state => state.isFocusActive);
  const tickFocusTimer = useAppStore(state => state.tickFocusTimer);

  useEffect(() => {
    // Global Focus Timer tick
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

  useEffect(() => {
    // Check initial theme preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const getHeaderInfo = () => {
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
      default:
        return { title: "Good morning, Azlan", subtitle: "Here is your wellness overview for today." };
    }
  };

  const headerInfo = getHeaderInfo();

  // Custom header actions for specific pages
  const getHeaderActions = () => {
    if (activeTab === 'analytics') {
      return (
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden md:flex items-center bg-secondary p-1 border border-border rounded-lg">
            <button className="px-3 py-1.5 text-xs font-medium bg-background text-foreground shadow-sm border border-border/50 rounded-md">
              Last 7 Days
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/50 transition rounded-md">
              Last 30 Days
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/50 transition rounded-md">
              Custom
            </button>
          </div>
          <button className="flex items-center gap-2 bg-background hover:bg-secondary text-foreground border border-border px-3 lg:px-4 py-2 font-medium text-sm transition-all shadow-sm rounded-lg">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      );
    }
    if (activeTab === 'limits') {
      return (
        <div className="flex items-center gap-2 lg:gap-4">
          <button className="hidden sm:flex items-center gap-2 bg-transparent hover:bg-secondary text-foreground px-4 py-2 font-medium text-sm transition-all border border-border rounded-lg">
            Discard
          </button>
          <button className="flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-3 lg:px-4 py-2 font-medium text-sm transition-all shadow-sm rounded-lg">
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      );
    }
    return undefined; // Default header contents (Search, Bell, Profile)
  };

  return (
    <div className="bg-background text-foreground min-h-screen flex overflow-hidden selection:bg-chart-1 selection:text-white">
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

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <Header 
          toggleSidebar={toggleSidebar} 
          toggleTheme={toggleTheme} 
          isDark={isDark}
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
        >
          {getHeaderActions()}
        </Header>
        
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'focus' && <FocusMode />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'limits' && <Limits />}
        
      </main>
    </div>
  );
}

export default App;
