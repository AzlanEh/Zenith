import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];

export function RecentEntries() {
  const { dailyStats, loadDailyStats } = useAppStore();

  useEffect(() => {
    loadDailyStats();
  }, [loadDailyStats]);

  const apps = dailyStats?.apps ? [...dailyStats.apps].sort((a, b) => b.duration_seconds - a.duration_seconds).slice(0, 5) : [];

  return (
    <div className="glass-panel rounded-2xl p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg text-foreground">Top Used Apps</h3>
        <button className="text-xs text-primary flex items-center gap-1 hover:underline">
          See All
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      
      <div className="relative border-l-2 border-secondary ml-3 space-y-6">
        {apps.length === 0 && (
          <div className="text-sm text-muted-foreground pl-6">No app activity recorded today.</div>
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
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{app.app_name}</h4>
                    <span className="text-xs text-muted-foreground mt-1 block">{app.category || 'Uncategorized'}</span>
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
    </div>
  );
}
