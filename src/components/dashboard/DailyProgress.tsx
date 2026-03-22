import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { GoalProgress } from '../../types';
import { Target, AlertCircle } from 'lucide-react';

export function DailyProgress() {
  const [progressItems, setProgressItems] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const goals = await api.getGoalsProgress();
      setProgressItems(goals);
    } catch (e) {
      console.error('Failed to load goals progress', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string, is_met: boolean) => {
    if (is_met) return 'bg-chart-2'; // Achieved/Met (green-ish)
    switch (status) {
      case 'warning': return 'bg-chart-4'; // Warning (orange/red)
      case 'exceeded': return 'bg-chart-5'; // Failed/Exceeded
      case 'on_track': return 'bg-chart-1'; // Good (blue-ish)
      default: return 'bg-chart-3';
    }
  };

  return (
    <div className="glass-panel rounded-lg p-6 lg:p-8 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Daily Goals
        </h3>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">Options</button>
      </div>
      
      <div className="space-y-6 flex-1 flex flex-col">
        {loading ? (
          <div className="animate-pulse space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-secondary rounded w-24"></div>
                  <div className="h-4 bg-secondary rounded w-16"></div>
                </div>
                <div className="h-2.5 bg-secondary rounded-full w-full"></div>
              </div>
            ))}
          </div>
        ) : progressItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-xl">
            <AlertCircle className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-foreground font-medium">No Goals Set</p>
            <p className="text-xs text-muted-foreground mt-1">Set daily limits or minimum productive time in Settings.</p>
          </div>
        ) : (
          progressItems.map(item => {
            const formatMins = (m: number) => {
              const hrs = Math.floor(m / 60);
              const mins = m % 60;
              return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
            };

            const isLimit = 'daily_limit' in item.goal_type || 'app_limit' in item.goal_type || 'category_limit' in item.goal_type;
            const progress = isLimit 
              ? Math.min(100, (item.current_minutes / item.target_minutes) * 100)
              : Math.min(100, (item.current_minutes / item.target_minutes) * 100);

            return (
              <div key={item.goal_id} className="space-y-2 group">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">{item.goal_name}</span>
                  <span className="text-muted-foreground text-xs font-medium">
                    {formatMins(item.current_minutes)} / {formatMins(item.target_minutes)}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getStatusColor(item.status, item.is_met)} rounded-full transition-all duration-1000 ease-out`} 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
