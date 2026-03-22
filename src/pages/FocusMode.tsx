import { useEffect, useState } from 'react';
import { Play, Pause, Square, Music, Settings, Activity, Plus } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import type { InstalledApp, FocusSettings } from '../types';
import { AppIcon } from '../components/AppIcon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';

export function FocusMode() {
  const isFocusActive = useAppStore(state => state.isFocusActive);
  const focusTimeLeft = useAppStore(state => state.focusTimeLeft);
  const toggleFocusTimer = useAppStore(state => state.toggleFocusTimer);
  const resetFocusTimer = useAppStore(state => state.resetFocusTimer);

  const [settings, setSettings] = useState<FocusSettings | null>(null);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, appsData] = await Promise.all([
        api.getFocusSettings(),
        api.getInstalledApps()
      ]);
      setSettings(settingsData);
      setInstalledApps(appsData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBlockedApp = async (appName: string) => {
    try {
      await api.addFocusBlockedApp(appName);
      await loadData();
    } catch (e) {
      console.error("Failed to block app", e);
    }
  };

  const handleRemoveBlockedApp = async (appName: string) => {
    try {
      await api.removeFocusBlockedApp(appName);
      await loadData();
    } catch (e) {
      console.error("Failed to unblock app", e);
    }
  };

  const minutes = Math.floor(focusTimeLeft / 60);
  const seconds = focusTimeLeft % 60;

  // Apps currently blocked
  const blockedAppsList = settings?.blocked_apps || [];
  
  // Available to block
  const availableApps = installedApps.filter(app => !blockedAppsList.includes(app.name));

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto h-[calc(100vh-100px)] pb-12 w-full">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
        {/* Timer Section */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="glass-panel flex-1 flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden group rounded-2xl">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col items-center justify-between h-full w-full max-w-md mx-auto">
              <div className="flex flex-col items-center gap-2">
                <span className="px-3 py-1 bg-secondary text-xs font-medium tracking-widest uppercase border border-border">Deep Work</span>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Activity className="w-4 h-4" />
                  <span>Session 1 of 4</span>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <div className="text-[6rem] sm:text-[8rem] lg:text-[10rem] leading-none font-mono font-light text-foreground tracking-tighter tabular-nums select-none transition-all">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
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
                     <span className="material-symbols-outlined text-muted-foreground text-lg">edit</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="What are you working on?" 
                    className="w-full bg-background border border-border p-4 pl-11 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors rounded-lg placeholder:text-muted-foreground text-center" 
                    defaultValue="Writing Q3 Strategy Document"
                  />
                </div>
                
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={toggleFocusTimer}
                    className="flex-1 max-w-[200px] h-14 bg-foreground text-background hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 font-medium text-lg rounded-xl"
                  >
                    {isFocusActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                    <span>{isFocusActive ? 'Pause' : 'Start Focus'}</span>
                  </button>
                  <button 
                    onClick={resetFocusTimer}
                    className="size-14 border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center rounded-xl"
                  >
                    <Square className="w-5 h-5 fill-current" />
                  </button>
                </div>
                
                <div className="flex justify-center gap-6 pt-4 border-t border-border/50">
                  <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
                    <Settings className="w-4 h-4" />
                    Timer Settings
                  </button>
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
          <div className="glass-panel p-6 flex flex-col gap-6 rounded-2xl">
            <h3 className="text-lg font-serif-accent text-foreground border-b border-border pb-3">Focus Statistics</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Focus Score</span>
                  <span className="text-xs font-bold text-chart-1 bg-chart-1/10 px-2 py-0.5 border border-chart-1/20 rounded">+5%</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-light text-foreground">84</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Excellent focus this week.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">Session Avg</span>
                  <span className="text-xl font-light text-foreground">42m</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">Distractions</span>
                  <span className="text-xl font-light text-foreground">3</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 flex-1 flex flex-col rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-lg font-serif-accent text-foreground">Blocked Apps</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-secondary text-foreground border border-border rounded">{isFocusActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {blockedAppsList.length === 0 && (
                <div className="text-center p-4 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                  No apps blocked. Click manage to add apps.
                </div>
              )}
              {blockedAppsList.map((appName) => {
                const appInfo = installedApps.find(a => a.name === appName);
                return (
                  <div key={appName} className="flex items-center justify-between p-3 border border-border bg-background/50 hover:bg-secondary/50 transition-colors rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-secondary flex items-center justify-center text-muted-foreground rounded-lg p-1">
                        <AppIcon appName={appName} iconHint={appInfo?.icon ?? undefined} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{appName}</p>
                        <p className="text-xs text-muted-foreground">{appInfo?.categories?.[0] || 'App'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveBlockedApp(appName)}
                      disabled={isFocusActive}
                      className="text-muted-foreground hover:text-chart-4 disabled:opacity-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                );
              })}
            </div>
            
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
              <DialogTrigger asChild>
                <button 
                  disabled={isFocusActive}
                  className="w-full mt-4 py-2.5 text-sm font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border rounded-xl disabled:opacity-50"
                >
                  Manage Blocklist
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-6 bg-background rounded-2xl">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-serif-accent">Add App to Blocklist</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {availableApps.map(app => (
                    <button
                      key={app.name}
                      onClick={() => {
                        handleAddBlockedApp(app.name);
                        setIsManageOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left border border-transparent hover:border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 bg-background border border-border flex items-center justify-center rounded-lg p-1">
                           <AppIcon appName={app.name} iconHint={app.icon ?? undefined} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{app.name}</p>
                          <p className="text-xs text-muted-foreground">{app.categories?.[0] || 'App'}</p>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
