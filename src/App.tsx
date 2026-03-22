import { useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import { useDarkMode } from "./hooks/useDarkMode";

import { Sidebar, Page } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { FocusMode } from './pages/FocusMode';
import { Analytics } from './pages/Analytics';
import { Limits } from './pages/Limits';

function App() {
  const activeTab = useAppStore(state => state.activeTab);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const sidebarOpen = useAppStore(state => state.mobileSidebarOpen);
  const setSidebarOpen = useAppStore(state => state.setMobileSidebarOpen);
  const isFocusActive = useAppStore(state => state.isFocusActive);
  const tickFocusTimer = useAppStore(state => state.tickFocusTimer);

  useDarkMode(); // Automatically handles applying theme to document and listening to system theme changes

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
      default: {
        const today = new Date();
        const dateString = today.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        // Add appropriate suffix (st, nd, rd, th) to the day
        const day = today.getDate();
        const suffix = ['th', 'st', 'nd', 'rd'][(day % 10 > 3 ? 0 : (day % 100 - day % 10 !== 10 ? 1 : 0) * (day % 10))];
        const formattedDate = dateString.replace(/\d+/, day + suffix);
        
        return { title: "Today's Overview", subtitle: formattedDate };
      }
    }
  };

  const headerInfo = getHeaderInfo();

  // Custom header actions for specific pages
  const getHeaderActions = () => {
    return undefined; // Handled within individual pages
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

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-background">
        <Header 
          toggleSidebar={toggleSidebar} 
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
        >
          {getHeaderActions()}
        </Header>
        
        <div key={activeTab} className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'focus' && <FocusMode />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'limits' && <Limits />}
        </div>
      </main>
    </div>
  );
}

export default App;
