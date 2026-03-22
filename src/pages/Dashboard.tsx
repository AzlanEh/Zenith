import { useState, useEffect } from "react";
import { ActivityRing } from "../components/dashboard/ActivityRing";
import { AIInsights } from "../components/dashboard/AIInsights";
import { DailyProgress } from "../components/dashboard/DailyProgress";
import { RecentEntries } from "../components/dashboard/RecentEntries";
import { WeeklyActivity } from "../components/dashboard/WeeklyActivity";
import { api } from "../services/api";
import type { AppUsage } from "../types";

export function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayApps, setSelectedDayApps] = useState<AppUsage[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDayApps([]);
      return;
    }

    async function loadDayApps() {
      setIsLoadingApps(true);
      try {
        const data = await api.getHistoricalData(selectedDate!, selectedDate!);
        setSelectedDayApps(
          data.app_usage
            .sort((a, b) => b.duration_seconds - a.duration_seconds)
            .slice(0, 6),
        );
      } catch (error) {
        console.error("Failed to load historical data for day", error);
        setSelectedDayApps([]);
      } finally {
        setIsLoadingApps(false);
      }
    }

    loadDayApps();
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
          onClearDate={() => setSelectedDate(null)}
        />
      </div>
    </div>
  );
}
