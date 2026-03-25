import { useState, useEffect, useMemo } from "react";
import { ActivityRing } from "../components/dashboard/ActivityRing";
import { AIInsights } from "../components/dashboard/AIInsights";
import { DailyProgress } from "../components/dashboard/DailyProgress";
import { RecentEntries } from "../components/dashboard/RecentEntries";
import { WeeklyActivity } from "../components/dashboard/WeeklyActivity";
import { api } from "../services/api";
import type { AppUsage, InstalledApp } from "../types";
import { createAppIconResolver } from "../lib/appIconLookup";

export function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayApps, setSelectedDayApps] = useState<AppUsage[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);

  useEffect(() => {
    api
      .getInstalledApps()
      .then(setInstalledApps)
      .catch((error) => {
        console.error("Failed to load installed apps", error);
      });
  }, []);

  const resolveAppIconHint = useMemo(
    () => createAppIconResolver(installedApps),
    [installedApps],
  );

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDayApps([]);
      setIsLoadingApps(false);
      return;
    }

    let cancelled = false;
    setIsLoadingApps(true);

    api.getHistoricalData(selectedDate, selectedDate)
      .then((data) => {
        if (!cancelled) {
          setSelectedDayApps(
            data.app_usage
              .sort((a, b) => b.duration_seconds - a.duration_seconds)
              .slice(0, 6),
          );
        }
      })
      .catch((error) => {
        console.error("Failed to load historical data for day", error);
        if (!cancelled) setSelectedDayApps([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingApps(false);
      });

    return () => { cancelled = true; };
  }, [selectedDate]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 pb-20">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Content Area */}
        <div className="xl:col-span-2 space-y-6 lg:space-y-8">
          <ActivityRing />
          <WeeklyActivity onDayClick={(date) => setSelectedDate(date)} />
        </div>

        {/* Right Sidebar Area */}
        <div className="space-y-6 lg:space-y-8">
          <AIInsights />
          <DailyProgress />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:gap-8">
        <RecentEntries 
          selectedDate={selectedDate} 
          customApps={selectedDayApps} 
          isLoading={isLoadingApps} 
          resolveAppIconHint={resolveAppIconHint}
          onClearDate={() => setSelectedDate(null)}
        />
      </div>
    </div>
  );
}
