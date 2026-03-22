import { useAppStore } from "../store/useAppStore";
import { formatTime } from "../lib/utils";
import { useMemo, useEffect } from "react";

export function Analytics() {
  const {
    weeklyStats,
    dailyStats,
    weeklyHourlyUsage,
    loadWeeklyStats,
    loadDailyStats,
    loadWeeklyHourlyUsage,
  } = useAppStore();

  useEffect(() => {
    loadWeeklyStats();
    loadDailyStats();
    loadWeeklyHourlyUsage();
  }, [loadWeeklyStats, loadDailyStats, loadWeeklyHourlyUsage]);

  const avgDailyUse = useMemo(() => {
    if (!weeklyStats || weeklyStats.days.length === 0) return 0;
    return Math.round(weeklyStats.total_seconds / weeklyStats.days.length);
  }, [weeklyStats]);

  const maxWeeklyHourlySeconds = useMemo(() => {
    if (!weeklyHourlyUsage || weeklyHourlyUsage.length === 0) return 1;
    return Math.max(...weeklyHourlyUsage.map((h) => h.total_seconds));
  }, [weeklyHourlyUsage]);

  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      days.push(`${year}-${month}-${day}`);
    }
    return days;
  }, []);

  const sortedApps = useMemo(() => {
    if (!dailyStats) return [];
    return [...dailyStats.apps].sort(
      (a, b) => b.duration_seconds - a.duration_seconds,
    );
  }, [dailyStats]);

  const mostDistracting = useMemo(() => {
    return sortedApps.slice(0, 5);
  }, [sortedApps]);

  const totalPickups = useMemo(() => {
    if (!dailyStats) return 0;
    return dailyStats.apps.reduce((sum, app) => sum + app.session_count, 0);
  }, [dailyStats]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6 pb-20 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex flex-col justify-between rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Avg. Daily Use (7d)
              </p>
              <h3 className="text-4xl font-serif-accent text-foreground mt-2">
                {formatTime(avgDailyUse)}
              </h3>
            </div>
            <div className="p-2 bg-chart-1/10 text-chart-1 rounded-xl border border-chart-1/20">
              <span className="material-symbols-outlined">schedule</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              Based on weekly activity
            </span>
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Today's Usage
              </p>
              <h3 className="text-4xl font-serif-accent text-foreground mt-2">
                {formatTime(dailyStats?.total_seconds || 0)}
              </h3>
            </div>
            <div className="p-2 bg-chart-2/10 text-chart-2 rounded-xl border border-chart-2/20">
              <span className="material-symbols-outlined">today</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              Across all tracked applications
            </span>
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Total Sessions
              </p>
              <h3 className="text-4xl font-serif-accent text-foreground mt-2">
                {totalPickups}
              </h3>
            </div>
            <div className="p-2 bg-chart-4/10 text-chart-4 rounded-xl border border-chart-4/20">
              <span className="material-symbols-outlined">touch_app</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">App launches today</span>
          </div>
        </div>
      </div>

      {/* Heatmap & Distractions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass-panel p-6 rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-serif-accent text-foreground">
              Usage Heatmap (7 Days)
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-secondary border border-border rounded-sm"></div>
                <div className="w-3 h-3 bg-chart-1/30 rounded-sm"></div>
                <div className="w-3 h-3 bg-chart-1/60 rounded-sm"></div>
                <div className="w-3 h-3 bg-chart-1 rounded-sm"></div>
              </div>
              <span>More</span>
            </div>
          </div>
          <div className="overflow-x-auto pb-2 flex-1 flex items-center justify-center">
            <div className="w-max flex flex-col justify-center mt-4 px-2">
              <div
                className="flex justify-between text-xs text-muted-foreground font-mono ml-[3.25rem] mb-2 pr-1 w-full"
                style={{ maxWidth: "668px" }}
              >
                <span>12am</span>
                <span>4am</span>
                <span>8am</span>
                <span>12pm</span>
                <span>4pm</span>
                <span>8pm</span>
                <span>11pm</span>
              </div>
              <div className="flex flex-col gap-1 sm:gap-1">
                {last7Days.map((dateStr, dIdx) => {
                  const dateObj = new Date(dateStr);
                  const isToday = dIdx === 6;
                  const dayLabel = isToday
                    ? "Today"
                    : dateObj.toLocaleDateString(undefined, {
                        weekday: "short",
                      });

                  return (
                    <div key={dateStr} className="flex items-center gap-2">
                      <span className="w-10 text-xs text-muted-foreground font-medium text-right pr-2 shrink-0">
                        {dayLabel}
                      </span>
                      <div
                        className="grid gap-1"
                        style={{
                          gridTemplateColumns: "repeat(48, 10px)",
                        }}
                      >
                        {Array.from({ length: 48 }).map((_, hIdx) => {
                          const data = weeklyHourlyUsage.find(
                            (h) => h.date === dateStr && h.hour === hIdx,
                          );
                          const seconds = data ? data.total_seconds : 0;

                          let bgClass = "bg-secondary";
                          if (seconds > 0) {
                            const percent =
                              seconds / (maxWeeklyHourlySeconds || 1);
                            if (percent < 0.3) bgClass = "bg-chart-1/30";
                            else if (percent < 0.7) bgClass = "bg-chart-1/60";
                            else bgClass = "bg-chart-1";
                          }

                          // Calculate the display time
                          const hour = Math.floor(hIdx / 2);
                          const minutes = hIdx % 2 === 0 ? "00" : "30";
                          const timeStr = `${hour}:${minutes}`;

                          return (
                            <div
                              key={hIdx}
                              className={`w-[10px] h-[10px] rounded-sm ${bgClass} hover:opacity-80 transition-opacity cursor-pointer`}
                              title={`${dayLabel} ${timeStr} - ${formatTime(seconds)}`}
                            ></div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-serif-accent text-foreground">
              Top Applications
            </h3>
          </div>
          <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {mostDistracting.length === 0 ? (
              <div className="text-center text-muted-foreground mt-10">
                No app usage recorded today
              </div>
            ) : (
              mostDistracting.map((app, i) => {
                const colors = [
                  "bg-chart-1",
                  "bg-chart-2",
                  "bg-chart-3",
                  "bg-chart-4",
                  "bg-chart-5",
                ];
                const color = colors[i % colors.length];
                const width = dailyStats?.total_seconds
                  ? `${(app.duration_seconds / dailyStats.total_seconds) * 100}%`
                  : "0%";

                return (
                  <div key={app.app_name}>
                    <div className="flex justify-between items-end mb-1">
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          {app.app_name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {app.category || "Uncategorized"}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {formatTime(app.duration_seconds)}
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full`}
                        style={{ width }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-xl font-serif-accent text-foreground">
            Detailed App Usage
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Application</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Sessions</th>
                <th className="px-6 py-4 font-medium">Time Spent</th>
                <th className="px-6 py-4 font-medium text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedApps.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    No data available for today
                  </td>
                </tr>
              ) : (
                sortedApps.map((app) => {
                  const percent = dailyStats?.total_seconds
                    ? (
                        (app.duration_seconds / dailyStats.total_seconds) *
                        100
                      ).toFixed(1)
                    : "0";
                  return (
                    <tr
                      key={app.app_name}
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 bg-secondary rounded-lg flex items-center justify-center text-sm font-bold text-foreground border border-border shadow-sm">
                            {app.app_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">
                            {app.app_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-secondary text-xs rounded-md border border-border text-muted-foreground shadow-sm">
                          {app.category || "Uncategorized"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {app.session_count}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {formatTime(app.duration_seconds)}
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">
                        {percent}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {sortedApps.length > 0 && (
          <div className="p-4 border-t border-border flex justify-between items-center bg-secondary/20">
            <span className="text-xs text-muted-foreground">
              Showing {sortedApps.length} entries
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
