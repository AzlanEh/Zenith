
import { Play, Coffee, Shield, Edit3 } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-transform group text-center border-l-4 border-l-chart-1">
        <div className="size-10 rounded-full bg-chart-1/10 flex items-center justify-center text-chart-1 group-hover:scale-110 transition-transform">
          <Play className="w-5 h-5 fill-current" />
        </div>
        <span className="text-sm font-medium text-foreground">Start Focus</span>
      </button>
      
      <button className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-transform group text-center border-l-4 border-l-chart-2">
        <div className="size-10 rounded-full bg-chart-2/10 flex items-center justify-center text-chart-2 group-hover:scale-110 transition-transform">
          <Coffee className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-foreground">Take Break</span>
      </button>
      
      <button className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-transform group text-center border-l-4 border-l-chart-4">
        <div className="size-10 rounded-full bg-chart-4/10 flex items-center justify-center text-chart-4 group-hover:scale-110 transition-transform">
          <Shield className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-foreground">Block Apps</span>
      </button>
      
      <button className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-transform group text-center border-l-4 border-l-chart-5">
        <div className="size-10 rounded-full bg-chart-5/10 flex items-center justify-center text-chart-5 group-hover:scale-110 transition-transform">
          <Edit3 className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-foreground">Journal</span>
      </button>
    </div>
  );
}
