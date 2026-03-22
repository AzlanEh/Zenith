import { Play, Coffee, Shield, BarChart2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';

export function QuickActions() {
  const setActiveTab = useAppStore(state => state.setActiveTab);

  const handleTakeBreak = async () => {
    try {
      await api.startBreak();
    } catch(e) {
      console.error('Failed to start break', e);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button 
        onClick={() => setActiveTab('focus')}
        className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-transform group text-center border-l-4 border-l-chart-1"
      >
        <div className="size-10 rounded-full bg-chart-1/10 flex items-center justify-center text-chart-1 group-hover:scale-110 transition-transform">
          <Play className="w-5 h-5 fill-current" />
        </div>
        <span className="text-sm font-medium text-foreground">Start Focus</span>
      </button>
      
      <button 
        onClick={handleTakeBreak}
        className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-transform group text-center border-l-4 border-l-chart-2"
      >
        <div className="size-10 rounded-full bg-chart-2/10 flex items-center justify-center text-chart-2 group-hover:scale-110 transition-transform">
          <Coffee className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-foreground">Take Break</span>
      </button>
      
      <button 
        onClick={() => setActiveTab('limits')}
        className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-transform group text-center border-l-4 border-l-chart-4"
      >
        <div className="size-10 rounded-full bg-chart-4/10 flex items-center justify-center text-chart-4 group-hover:scale-110 transition-transform">
          <Shield className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-foreground">Block Apps</span>
      </button>
      
      <button 
        onClick={() => setActiveTab('analytics')}
        className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-transform group text-center border-l-4 border-l-chart-5"
      >
        <div className="size-10 rounded-full bg-chart-5/10 flex items-center justify-center text-chart-5 group-hover:scale-110 transition-transform">
          <BarChart2 className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-foreground">View Stats</span>
      </button>
    </div>
  );
}
