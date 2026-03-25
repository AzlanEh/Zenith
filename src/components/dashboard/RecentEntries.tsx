import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { AppUsage } from '../../types';
import { AppIcon } from '../AppIcon';

const COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];

interface RecentEntriesProps {
  selectedDate?: string | null;
  customApps?: AppUsage[];
  isLoading?: boolean;
  resolveAppIconHint?: (appName: string) => string | undefined;
  onClearDate?: () => void;
}

export function RecentEntries({ selectedDate, customApps, isLoading, resolveAppIconHint, onClearDate }: RecentEntriesProps) {
  const dailyStats = useAppStore(state => state.dailyStats);
  const loadDailyStats = useAppStore(state => state.loadDailyStats);

  const loadDailyStatsRef = useRef(loadDailyStats);
  loadDailyStatsRef.current = loadDailyStats;

  useEffect(() => {
    loadDailyStatsRef.current();
  }, []);

  const apps = selectedDate && customApps 
    ? customApps 
    : (dailyStats?.apps ? [...dailyStats.apps].sort((a, b) => b.duration_seconds - a.duration_seconds).slice(0, 6) : []);

  const title = selectedDate 
    ? `Top Used Apps on ${new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`
    : "Top Used Apps";

  return (
    <div className="glass-panel rounded-lg p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg text-foreground">{title}</h3>
        <div className="flex items-center gap-4">
          {selectedDate && (
            <button 
              onClick={onClearDate}
              aria-label="Clear date selection"
              className="p-1 hover:bg-secondary/80 rounded-full transition-colors flex items-center justify-center"
              title="Clear selection"
            >
              <span className="material-symbols-outlined text-muted-foreground text-sm">close</span>
            </button>
          )}
          <button className="text-xs text-primary flex items-center gap-1 hover:underline">
            See All
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
        </div>
      ) : (
        <div className="relative border-l-2 border-secondary ml-3 space-y-6">
          {apps.length === 0 && (
            <div className="text-sm text-muted-foreground pl-6">
              {selectedDate ? "No app activity recorded for this day." : "No app activity recorded today."}
            </div>
          )}
          {apps.map((app, idx) => {
            const color = COLORS[idx % COLORS.length];
            const hours = Math.floor(app.duration_seconds / 3600);
            const minutes = Math.floor((app.duration_seconds % 3600) / 60);
            const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            
            return (
              <div key={app.app_name} className="relative pl-6">
                <div className={`absolute -left-[9px] top-1 size-4 rounded-full ${color} ring-4 ring-background`}></div>
                <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="size-9 bg-background border border-border rounded-lg p-1 flex items-center justify-center shrink-0">
                        <AppIcon
                          appName={app.app_name}
                          iconHint={resolveAppIconHint?.(app.app_name) ?? undefined}
                          className="w-full h-full"
                          shape="rounded-md"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{app.app_name}</h4>
                        <span className="text-xs text-muted-foreground mt-1 block">{app.category || 'Uncategorized'}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-md bg-background border border-border text-xs font-medium ${color.replace('bg-', 'text-')}`}>
                      {durationStr}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
