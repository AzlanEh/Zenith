import { useWeeklyStats } from "../../queries";
import { useMemo, memo } from "react";
import { WeeklyActivityChart } from "./WeeklyActivityChart";
import { formatTime } from "../../lib/utils";

interface WeeklyActivityProps {
  onDayClick?: (date: string) => void;
}

const WeeklyActivityInner = memo(function WeeklyActivityInner({ onDayClick }: WeeklyActivityProps) {
  const { data: weeklyStats } = useWeeklyStats();

  const chartData = useMemo(() => {
    if (!weeklyStats || !weeklyStats.days) return [];

    const days = [];
    let hasAnyData = false;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const stat = weeklyStats.days.find((s) => s.date === dateStr);
      if (stat) hasAnyData = true;

      days.push({
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        fullDate: dateStr,
        seconds: stat ? stat.total_seconds : 0,
        hours: stat ? Number((stat.total_seconds / 3600).toFixed(1)) : 0,
      });
    }

    if (!hasAnyData && weeklyStats.days.length > 0) {
      return weeklyStats.days.slice(-7).map((stat) => {
        const d = new Date(stat.date);
        return {
          day: isNaN(d.getTime()) ? stat.date.slice(-5) : d.toLocaleDateString("en-US", { weekday: "short" }),
          fullDate: stat.date,
          seconds: stat.total_seconds,
          hours: Number((stat.total_seconds / 3600).toFixed(1)),
        };
      });
    }

    return days;
  }, [weeklyStats]);

  const maxHours = Math.max(...chartData.map((d) => d.hours), 1);

  if (!weeklyStats) {
    return (
      <div className="glass-panel rounded-lg p-6 lg:p-8 flex flex-col min-h-[300px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-serif-accent text-foreground">Weekly Activity</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex space-x-2 items-end h-32">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
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
        <WeeklyActivityChart chartData={chartData} maxHours={maxHours} onDayClick={onDayClick} />
      </div>
    </div>
  );
});

export function WeeklyActivity({ onDayClick }: WeeklyActivityProps) {
  return <WeeklyActivityInner onDayClick={onDayClick} />;
}