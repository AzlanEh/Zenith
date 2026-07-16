import { useMemo } from 'react';
import { useDailyStats, useWeeklyStats } from '../../queries';
import { ArrowRight, BatteryCharging, Brain, Hourglass, Lightbulb, Smile, Sparkles } from 'lucide-react';

const INSIGHT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hourglass: Hourglass,
  lightbulb: Lightbulb,
  battery: BatteryCharging,
  smile: Smile,
};

function InsightIcon({ icon, className }: { icon: string; className?: string }) {
  const LucideIcon = INSIGHT_ICONS[icon];
  if (!LucideIcon) return null;
  return <LucideIcon className={className} />;
}

export function AIInsights() {
  const { data: dailyStats } = useDailyStats();
  const { data: weeklyStats } = useWeeklyStats();

  const insights = useMemo(() => {
    const generated = [];
    
    if (!dailyStats && !weeklyStats) {
      return [
        {
          id: '1',
          title: 'Collecting Data',
          description: 'We are currently gathering data to provide personalized insights for reclaiming cognitive sovereignty.',
          icon: 'hourglass',
          color: 'text-chart-1'
        }
      ];
    }

    // Top Category Insight
    if (dailyStats?.apps && dailyStats.apps.length > 0) {
      const topApp = dailyStats.apps.reduce((prev, current) => (prev.duration_seconds > current.duration_seconds) ? prev : current);
      const hours = Math.floor(topApp.duration_seconds / 3600);
      const mins = Math.floor((topApp.duration_seconds % 3600) / 60);
      
      generated.push({
        id: '2',
        title: 'App Usage Trend',
        description: `You've spent ${hours > 0 ? `${hours}h ` : ''}${mins}m on ${topApp.app_name} today. Consider setting a daily limit if this exceeds your goals.`,
        icon: 'lightbulb',
        color: 'text-chart-3'
      });
    }

    // Total Time Insight
    if (dailyStats && dailyStats.total_seconds > 4 * 3600) {
      generated.push({
        id: '3',
        title: 'High Screen Time',
        description: `You've been active for over 4 hours today. Remember to take a 5-minute break to rest your eyes.`,
        icon: 'battery',
        color: 'text-chart-4'
      });
    } else if (dailyStats) {
      generated.push({
        id: '4',
        title: 'Healthy Balance',
        description: `Your screen time is looking balanced today. Great job maintaining focus while limiting overall usage!`,
        icon: 'smile',
        color: 'text-chart-2'
      });
    }

    return generated;
  }, [dailyStats, weeklyStats]);

  return (
    <div className="glass-panel rounded-lg p-6 lg:p-8 bg-gradient-to-br from-card to-secondary/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Brain className="w-48 h-48" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-serif-accent text-lg font-bold text-foreground">AI Insights</h3>
        </div>
        
        <div className="space-y-4">
          {insights.map(insight => (
            <div key={insight.id} className="flex gap-4 p-4 rounded-xl bg-background/50 border border-border backdrop-blur-sm hover:border-primary/30 transition-colors">
              <div className={`mt-0.5 ${insight.color}`}>
                <InsightIcon icon={insight.icon} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{insight.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <button className="mt-6 text-xs font-medium text-primary flex items-center gap-1 hover:underline">
          View all recommendations
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
