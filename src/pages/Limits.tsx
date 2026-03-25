import { useState, useEffect, useRef } from 'react';
import { Plus, MonitorOff, ShieldAlert, CheckCircle2, Search } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import type { InstalledApp } from '../types';
import { AppIcon } from '../components/AppIcon';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';

export function Limits() {
  const appLimits = useAppStore(state => state.appLimits);
  const loadAppLimits = useAppStore(state => state.loadAppLimits);
  const setAppLimit = useAppStore(state => state.setAppLimit);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const loadAppLimitsRef = useRef(loadAppLimits);
  loadAppLimitsRef.current = loadAppLimits;

  useEffect(() => {
    if (!isAddOpen) {
      setSearchQuery('');
      setSelectedApps([]);
      setActiveCategory('All');
    }
  }, [isAddOpen]);

  useEffect(() => {
    loadAppLimitsRef.current();
    api.getInstalledApps().then(setInstalledApps).catch((e) => {
      console.error("Failed to load installed apps:", e);
      toast.error("Failed to load installed apps");
    });
  }, []);

  const [downtimeEnabled, setDowntimeEnabled] = useState(true);
  const [strictMode, setStrictMode] = useState(false);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const handleUpdateLimit = async (appName: string, minutes: number, blockWhenExceeded: boolean) => {
    await setAppLimit(appName, minutes, blockWhenExceeded);
  };

  // Build name → icon hint map for quick lookup
  const iconMap = new Map<string, string | null>(
    installedApps.map((a) => [a.name.toLowerCase(), a.icon ?? null])
  );

  const filteredInstalledApps = installedApps.filter((app) => {
    const notLimited = !appLimits.find(
      (l) => l.app_name.toLowerCase() === app.name.toLowerCase()
    );
    const matchesSearch =
      searchQuery === "" ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase());
    return notLimited && matchesSearch;
  });

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto flex flex-col gap-8 pb-20 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Daily App Limits */}
        <section className="glass-panel p-6 md:p-8 rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-serif-accent text-foreground">Daily App Limits</h3>
              <p className="text-sm text-muted-foreground mt-1">Set maximum daily usage time for specific applications.</p>
            </div>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <button className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Add App
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-background border-border shadow-2xl flex flex-col max-h-[90vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
                {/* Header & Search */}
                <div className="p-8 space-y-6 border-b border-border bg-secondary/10 relative">
                  <div className="flex justify-between items-center">
                    <div>
                      <DialogTitle className="text-3xl font-serif-accent italic leading-none text-foreground">
                        Add Application
                      </DialogTitle>
                      <p className="text-[0.65rem] font-mono uppercase tracking-[0.3em] text-muted-foreground mt-2">
                        Constraint selection module
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddOpen(false)}
                      aria-label="Close dialog"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="w-6 h-6 rotate-45" />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-full bg-secondary/20 border-0 border-b-2 border-border/50 focus:border-primary focus:ring-0 text-foreground pl-12 py-4 text-sm tracking-wide transition-all placeholder:text-muted-foreground outline-none"
                      placeholder="Search apps..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background">
                  {/* Category Filter Chips */}
                  <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    {['All', ...Array.from(new Set(filteredInstalledApps.map(a => a.categories?.[0] || 'Uncategorized').filter(Boolean)))].map(category => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`whitespace-nowrap px-4 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest transition-all ${
                          activeCategory === category
                            ? 'bg-foreground text-background'
                            : 'border border-border text-muted-foreground hover:text-foreground hover:border-foreground'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {filteredInstalledApps
                      .filter(app => activeCategory === 'All' || (app.categories?.[0] || 'Uncategorized') === activeCategory)
                      .map((app) => {
                      const isSelected = selectedApps.includes(app.name);
                      return (
                        <div
                          key={app.name}
                          onClick={() => {
                            setSelectedApps(prev => 
                              prev.includes(app.name) ? prev.filter(n => n !== app.name) : [...prev, app.name]
                            );
                          }}
                          className={`flex items-center justify-between p-4 transition-colors group cursor-pointer ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-secondary/10 hover:bg-secondary/30 text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 flex items-center justify-center p-1 ${isSelected ? 'bg-primary-foreground/20' : 'bg-background border border-border'}`}>
                              <AppIcon
                                appName={app.name}
                                iconHint={app.icon ?? undefined}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div>
                              <span className="text-sm font-medium block">{app.name}</span>
                              <span className={`text-[0.6rem] font-mono uppercase tracking-wider opacity-60 ${!isSelected && 'text-muted-foreground'}`}>
                                {app.categories?.[0] || 'Uncategorized'}
                              </span>
                            </div>
                          </div>
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 fill-current" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-muted-foreground group-hover:border-primary transition-colors"></div>
                          )}
                        </div>
                      );
                    })}
                    {filteredInstalledApps.filter(app => activeCategory === 'All' || (app.categories?.[0] || 'Uncategorized') === activeCategory).length === 0 && (
                      <div className="text-center py-12 text-muted-foreground text-sm font-mono uppercase tracking-widest">
                        No applications found
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Actions */}
                <div className="p-6 md:p-8 bg-secondary/10 border-t border-border flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.65rem] font-mono text-muted-foreground uppercase tracking-wider">
                      {selectedApps.length} application{selectedApps.length !== 1 && 's'} selected
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setIsAddOpen(false)}
                      className="px-6 py-3 text-[0.7rem] font-mono uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={selectedApps.length === 0}
                      onClick={() => {
                        selectedApps.forEach(name => handleUpdateLimit(name, 60, true));
                        setIsAddOpen(false);
                      }}
                      className="px-8 py-3 text-[0.7rem] font-mono uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Selected
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex flex-col gap-6">
            {appLimits.length === 0 && (
              <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
                <p>No app limits set. Click "Add App" to start.</p>
              </div>
            )}
            {appLimits.map((app) => (
              <div key={app.id} className={`flex flex-col md:flex-row md:items-center gap-4 p-5 border border-border bg-secondary/10 hover:bg-secondary/30 transition-colors rounded-xl ${!app.block_when_exceeded && 'opacity-60 grayscale'}`}>
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="size-10 bg-background border border-border flex items-center justify-center shrink-0 rounded-lg p-1">
                    <AppIcon appName={app.app_name} iconHint={iconMap.get(app.app_name.toLowerCase()) || undefined} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{app.app_name}</span>
                  </div>
                </div>
                
                <div className="flex-1 px-2 md:px-6">
                  <div className="flex justify-between mb-2 text-xs font-medium">
                    <span className="text-muted-foreground">0h</span>
                    <span className="text-foreground">{formatTime(app.daily_limit_minutes)} limit</span>
                    <span className="text-muted-foreground">4h</span>
                  </div>
                  <input
                    className="w-full"
                    max={240}
                    min="5"
                    step="5"
                    type="range"
                    value={app.daily_limit_minutes}
                    disabled={!app.block_when_exceeded}
                    onChange={(e) => {
                      // Update optimism
                      handleUpdateLimit(app.app_name, parseInt(e.target.value), app.block_when_exceeded);
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-end min-w-[80px] pt-2 md:pt-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={app.block_when_exceeded}
                      onChange={() => {
                        handleUpdateLimit(app.app_name, app.daily_limit_minutes, !app.block_when_exceeded);
                      }}
                    />
                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-foreground"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Global Restrictions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Downtime Schedule */}
          <section className="glass-panel p-6 md:p-8 rounded-lg flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-serif-accent text-foreground">Downtime</h3>
                <p className="text-sm text-muted-foreground mt-1">Schedule time away from the screen.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={downtimeEnabled}
                  onChange={() => setDowntimeEnabled(!downtimeEnabled)}
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-foreground"></div>
              </label>
            </div>
            
            <div className={`flex flex-col gap-4 flex-1 ${!downtimeEnabled && 'opacity-50 pointer-events-none'}`}>
              <div className="p-4 border border-border bg-background rounded-xl">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Everyday</label>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-light text-foreground">10:00 PM</span>
                  <span className="text-muted-foreground">to</span>
                  <span className="text-xl font-light text-foreground">07:00 AM</span>
                </div>
              </div>
              
              <div className="p-4 border border-border bg-background rounded-xl mt-auto">
                <div className="flex items-start gap-3">
                  <MonitorOff className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Block all apps during downtime</p>
                    <p className="text-xs text-muted-foreground mt-1">Only essential apps (Phone, Messages) will be available.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Strict Mode Configuration */}
          <section className="glass-panel p-6 md:p-8 rounded-lg border-t-4 border-t-chart-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-serif-accent text-foreground">Strict Blocking</h3>
                <p className="text-sm text-muted-foreground mt-1">Prevent overriding limits easily.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={strictMode}
                  onChange={() => setStrictMode(!strictMode)}
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-chart-4"></div>
              </label>
            </div>
            
            <div className={`space-y-4 flex-1 ${!strictMode && 'opacity-50 pointer-events-none'}`}>
              <div className="flex items-start gap-3 p-4 bg-chart-4/10 border border-chart-4/20 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-chart-4 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">
                  When strict mode is enabled, you cannot modify app limits or disable downtime until the next day.
                </p>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">Requires a complex password to bypass</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">15-second delay before changes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">Blocks uninstallation</span>
                </div>
              </div>
            </div>
          </section>
          
        </div>
    </div>
  );
}
