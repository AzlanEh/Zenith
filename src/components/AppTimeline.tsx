import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHourlyUsage, useDailyStats } from "@/queries";
import { formatTime } from "@/lib/utils";

interface AppTimelineProps {
  appName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppTimeline({ appName, open, onOpenChange }: AppTimelineProps) {
  const { data: hourly } = useHourlyUsage();
  const { data: daily } = useDailyStats();

  const appUsage = useMemo(() => {
    if (!daily) return null;
    return daily.apps.find((a) => a.app_name === appName) ?? null;
  }, [daily, appName]);

  const maxHourly = useMemo(() => {
    if (!hourly || hourly.length === 0) return 1;
    return Math.max(...hourly.map((h) => h.total_seconds));
  }, [hourly]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif-accent">{appName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Usage summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border bg-background">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Today</p>
              <p className="text-2xl font-mono font-bold">{formatTime(appUsage?.duration_seconds ?? 0)}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-background">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sessions</p>
              <p className="text-2xl font-mono font-bold">{appUsage?.session_count ?? 0}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-background">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Category</p>
              <p className="text-2xl font-mono font-bold text-sm mt-1.5">{appUsage?.category ?? "Uncategorized"}</p>
            </div>
          </div>

          {/* Hourly usage chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Hourly Usage Today</h4>
            <div className="h-48 flex items-end gap-1">
              {hourly && hourly.length > 0 ? hourly.map((h) => {
                const height = (h.total_seconds / maxHourly) * 100;
                return (
                  <div
                    key={h.hour}
                    className="flex-1 flex flex-col items-center gap-1 group relative"
                  >
                    <div
                      className="w-full bg-foreground/80 hover:bg-foreground transition-colors rounded-t"
                      style={{ height: `${Math.max(height, 1)}%` }}
                      title={`${h.hour}:00 - ${formatTime(h.total_seconds)}`}
                    />
                    <span className="text-[10px] text-muted-foreground">{h.hour}</span>
                  </div>
                );
              }) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  No hourly data available
                </div>
              )}
            </div>
          </div>

          {/* Peak times */}
          {hourly && hourly.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Peak Usage Times</h4>
              <div className="flex flex-wrap gap-2">
                {[...hourly]
                  .sort((a, b) => b.total_seconds - a.total_seconds)
                  .slice(0, 3)
                  .map((h) => (
                    <span
                      key={h.hour}
                      className="px-3 py-1 rounded-full bg-muted text-xs font-medium"
                    >
                      {h.hour}:00 — {formatTime(h.total_seconds)}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
