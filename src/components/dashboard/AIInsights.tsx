
import { insights } from '@/lib/mock-data';
import { Sparkles, Brain } from 'lucide-react';

export function AIInsights() {
  return (
    <div className="glass-panel rounded-2xl p-6 lg:p-8 bg-gradient-to-br from-card to-secondary/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Brain className="w-48 h-48" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-serif-accent text-lg font-bold text-foreground">AI Insights</h3>
        </div>
        
        <div className="space-y-4">
          {insights.map(insight => (
            <div key={insight.id} className="flex gap-4 p-4 rounded-xl bg-background/50 border border-border backdrop-blur-sm hover:border-primary/30 transition-colors">
              <div className={`mt-0.5 ${insight.color}`}>
                <span className="material-symbols-outlined">{insight.icon}</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{insight.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <button className="mt-6 text-xs font-medium text-primary flex items-center gap-1 hover:underline">
          View all recommendations
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
