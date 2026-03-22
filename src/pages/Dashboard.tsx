import { ActivityRing } from '../components/dashboard/ActivityRing';
import { QuickActions } from '../components/dashboard/QuickActions';
import { AIInsights } from '../components/dashboard/AIInsights';
import { DailyProgress } from '../components/dashboard/DailyProgress';
import { RecentEntries } from '../components/dashboard/RecentEntries';

export function Dashboard() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 pb-20">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Content Area */}
        <div className="xl:col-span-2 space-y-6 lg:space-y-8">
          <ActivityRing />
          <QuickActions />
        </div>
        
        {/* Right Sidebar Area */}
        <div className="space-y-6 lg:space-y-8">
          <AIInsights />
          <DailyProgress />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <RecentEntries />
        <div className="glass-panel rounded-2xl p-6 lg:p-8 flex items-center justify-center min-h-[300px] border-dashed border-2">
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <span className="material-symbols-outlined">add_chart</span>
            More widgets can go here
          </p>
        </div>
      </div>
    </div>
  );
}
