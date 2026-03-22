
import { progressItems } from '@/lib/mock-data';

export function DailyProgress() {
  return (
    <div className="glass-panel rounded-2xl p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg text-foreground">Daily Progress</h3>
        <button className="text-xs text-muted-foreground hover:text-foreground">Options</button>
      </div>
      
      <div className="space-y-6">
        {progressItems.map(item => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="text-muted-foreground">{item.value}</span>
            </div>
            <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out`} 
                style={{ width: `${item.progress}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
