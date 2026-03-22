import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Loader2 } from 'lucide-react';

const COLORS = ['text-chart-1', 'text-chart-2', 'text-chart-3', 'text-chart-4', 'text-chart-5'];
const ICONS = ['bolt', 'language', 'chat', 'public', 'apps'];

export function ActivityRing() {
  const [mounted, setMounted] = useState(false);
  const { dailyStats, loadDailyStats, loading } = useAppStore();

  useEffect(() => {
    setMounted(true);
    loadDailyStats();
  }, [loadDailyStats]);

  // Transform backend daily stats into top 3 metrics
  const apps = dailyStats?.apps ? [...dailyStats.apps].sort((a, b) => b.duration_seconds - a.duration_seconds).slice(0, 3) : [];
  
  // Provide fallbacks if no data
  const activityMetrics = apps.length > 0 ? apps.map((app, idx) => {
    const hours = app.duration_seconds / 3600;
    const isHours = hours >= 1;
    const valueStr = isHours 
      ? `${Math.floor(hours)}h ${Math.floor((app.duration_seconds % 3600) / 60)}m`
      : `${Math.floor(app.duration_seconds / 60)}m`;

    return {
      label: app.app_name,
      value: valueStr,
      max: Math.max(8, Math.ceil(hours + 2)), // Dynamic goal based on usage
      current: hours,
      color: COLORS[idx % COLORS.length],
      icon: ICONS[idx % ICONS.length],
    };
  }) : [
    { label: 'No Data Yet', value: '0m', max: 8, current: 0, color: 'text-chart-1', icon: 'hourglass_empty' }
  ];

  const totalSeconds = dailyStats?.total_seconds || 0;
  const totalHours = totalSeconds / 3600;
  // Calculate percentage based on a nominal 8-hour workday target
  const overallPercentage = Math.min(100, Math.round((totalHours / 8) * 100));

  if (loading.dailyStats && !dailyStats) {
    return (
      <div className="glass-panel rounded-lg p-6 lg:p-8 flex flex-col xl:flex-row gap-8 items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-lg p-6 lg:p-8 flex flex-col xl:flex-row gap-8 items-center justify-between">
      <div className="relative size-64 xl:size-72 flex-shrink-0">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          {/* Background tracks */}
          <circle cx="50" cy="50" r="42" fill="none" className="stroke-secondary" strokeWidth="6" />
          <circle cx="50" cy="50" r="32" fill="none" className="stroke-secondary" strokeWidth="6" />
          <circle cx="50" cy="50" r="22" fill="none" className="stroke-secondary" strokeWidth="6" />
          
          {/* Progress rings - with animation */}
          {activityMetrics.map((metric, idx) => {
            const r = 42 - (idx * 10);
            if (r < 10) return null; // Safety check
            const c = 2 * Math.PI * r;
            const percentage = Math.min(1, metric.current / metric.max);
            const dashoffset = c - (percentage * c);
            
            return (
              <circle 
                key={metric.label + idx}
                cx="50" 
                cy="50" 
                r={r} 
                fill="none" 
                className={`stroke-current ${metric.color} transition-all duration-1000 ease-out`}
                strokeWidth="6" 
                strokeLinecap="round" 
                strokeDasharray={c} 
                strokeDashoffset={mounted ? dashoffset : c}
              />
            );
          })}
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-serif-accent font-bold text-foreground">{overallPercentage}%</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Daily Goal</span>
          <span className="text-xs text-chart-1 font-medium mt-1 flex items-center gap-1">
            <span className="size-2 rounded-full bg-chart-1 inline-block"></span>
            Active
          </span>
        </div>
      </div>
      
      <div className="flex-1 w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg text-foreground">Top Applications</h3>
          <button className="text-xs text-primary hover:text-primary/80 font-medium px-3 py-1.5 bg-primary/10 rounded-full transition-colors">View All</button>
        </div>
        
        <div className="space-y-5">
          {activityMetrics.map((metric, idx) => (
            <div key={metric.label + idx} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={`size-8 rounded-full ${metric.color.replace('text-', 'bg-')}/20 flex items-center justify-center text-current ${metric.color}`}>
                   <span className="material-symbols-outlined text-sm">{metric.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors max-w-[150px] truncate">{metric.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{metric.current.toFixed(1)}h / {metric.max}h</p>
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <p className="text-sm font-bold text-foreground">{metric.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
