import { useAppStore } from "../../store/useAppStore";
import { useMemo, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatTime } from "../../lib/utils";

export function WeeklyActivity({ onDayClick }: { onDayClick?: (date: string) => void }) {
  const { weeklyStats, loadWeeklyStats } = useAppStore();
  
  useEffect(() => {
    loadWeeklyStats();
  }, [loadWeeklyStats]);
  
  const chartData = useMemo(() => {
    if (!weeklyStats || !weeklyStats.days) return [];
    
    // Create an array of the last 7 days including today
    const days = [];
    let hasAnyData = false;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Format as local YYYY-MM-DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const stat = weeklyStats.days.find(s => s.date === dateStr);
      if (stat) hasAnyData = true;

      days.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: dateStr,
        seconds: stat ? stat.total_seconds : 0,
        hours: stat ? Number((stat.total_seconds / 3600).toFixed(1)) : 0
      });
    }

    // Fallback: If local dates didn't match anything (e.g. older mock data),
    // use the most recent up to 7 items from the provided stats.
    if (!hasAnyData && weeklyStats.days.length > 0) {
      return weeklyStats.days.slice(-7).map(stat => {
        const d = new Date(stat.date);
        return {
          day: isNaN(d.getTime()) ? stat.date.slice(-5) : d.toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: stat.date,
          seconds: stat.total_seconds,
          hours: Number((stat.total_seconds / 3600).toFixed(1))
        };
      });
    }

    return days;
  }, [weeklyStats]);

  const maxHours = Math.max(...chartData.map(d => d.hours), 1);

  if (!weeklyStats) {
    return (
      <div className="glass-panel rounded-lg p-6 lg:p-8 flex flex-col min-h-[300px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-serif-accent text-foreground">Weekly Activity</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex space-x-2 items-end h-32">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="w-8 bg-muted rounded-t-md" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-lg p-6 lg:p-8 flex flex-col h-[350px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-serif-accent text-foreground">Weekly Activity</h3>
        <p className="text-sm font-medium text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
          {formatTime(weeklyStats.total_seconds)} Total
        </p>
      </div>
      
      <div className="flex-1 w-full min-h-0 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              tickFormatter={(value) => `${value}h`}
              domain={[0, Math.ceil(maxHours)]}
            />
            <Tooltip 
              cursor={{ fill: 'var(--color-secondary)', opacity: 0.4 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover border border-border shadow-md rounded-lg p-3 text-sm">
                      <p className="font-medium text-foreground mb-1">{payload[0].payload.fullDate}</p>
                      <p className="text-primary font-bold">
                        {formatTime(payload[0].payload.seconds)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={40} minPointSize={4}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill=""
                  onClick={() => onDayClick?.(entry.fullDate)}
                  className={`fill-current transition-all duration-500 cursor-pointer ${
                    index === chartData.length - 1 
                      ? "text-primary" 
                      : "text-primary/40 hover:text-primary/80"
                  }`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
