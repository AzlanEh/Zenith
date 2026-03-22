

export function Analytics() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Generating mock heatmap data (0-3 intensity)
  const heatmapData = Array.from({ length: 7 }, () => 
    Array.from({ length: 24 }, () => Math.floor(Math.random() * 4))
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6 pb-20 w-full">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex flex-col justify-between rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg. Daily Use</p>
              <h3 className="text-4xl font-serif-accent text-foreground mt-2">5h 12m</h3>
            </div>
            <div className="p-2 bg-chart-1/10 text-chart-1 rounded-xl border border-chart-1/20">
              <span className="material-symbols-outlined">schedule</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-chart-1 font-bold bg-chart-1/10 px-1.5 py-0.5 rounded">-12m</span>
            <span className="text-muted-foreground">vs previous 7 days</span>
          </div>
        </div>
        
        <div className="glass-panel p-6 flex flex-col justify-between rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Focus Score Trend</p>
              <h3 className="text-4xl font-serif-accent text-foreground mt-2">
                78<span className="text-lg text-muted-foreground font-normal ml-1">/100</span>
              </h3>
            </div>
            <div className="p-2 bg-chart-2/10 text-chart-2 rounded-xl border border-chart-2/20">
              <span className="material-symbols-outlined">psychology</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-chart-2 font-bold bg-chart-2/10 px-1.5 py-0.5 rounded">+4 pts</span>
            <span className="text-muted-foreground">vs previous 7 days</span>
          </div>
        </div>
        
        <div className="glass-panel p-6 flex flex-col justify-between rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Pickups</p>
              <h3 className="text-4xl font-serif-accent text-foreground mt-2">342</h3>
            </div>
            <div className="p-2 bg-chart-4/10 text-chart-4 rounded-xl border border-chart-4/20">
              <span className="material-symbols-outlined">touch_app</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-chart-4 font-bold bg-chart-4/10 px-1.5 py-0.5 rounded">+18</span>
            <span className="text-muted-foreground">vs previous 7 days</span>
          </div>
        </div>
      </div>

      {/* Heatmap & Distractions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass-panel p-6 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-serif-accent text-foreground">Usage Heatmap</h3>
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
          <div className="overflow-x-auto pb-2 flex-1">
            <div className="min-w-[600px] h-full flex flex-col">
              <div className="flex pl-10 mb-2 justify-between text-xs text-muted-foreground font-mono">
                <span>12am</span><span>4am</span><span>8am</span><span>12pm</span><span>4pm</span><span>8pm</span>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                {days.map((day, dIdx) => (
                  <div key={day} className="flex items-center gap-1 flex-1 min-h-[24px]">
                    <span className="w-10 text-xs text-muted-foreground font-medium text-right pr-2">{day}</span>
                    <div className="flex-1 grid grid-cols-24 gap-1 h-full" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                      {heatmapData[dIdx].map((intensity, hIdx) => {
                        let bgClass = "bg-secondary";
                        if (intensity === 1) bgClass = "bg-chart-1/30";
                        if (intensity === 2) bgClass = "bg-chart-1/60";
                        if (intensity === 3) bgClass = "bg-chart-1";
                        
                        return <div key={hIdx} className={`rounded-sm ${bgClass} hover:opacity-80 transition-opacity cursor-pointer`} title={`${day} ${hIdx}:00 - Intensity: ${intensity}`}></div>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="glass-panel p-6 flex flex-col rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-serif-accent text-foreground">Most Distracting</h3>
            <button className="text-xs font-medium text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-5 flex-1">
            {[
              { name: 'Instagram', category: 'Social', time: '1h 45m', width: '85%', color: 'bg-chart-4' },
              { name: 'Twitter', category: 'Social', time: '1h 12m', width: '65%', color: 'bg-chart-4' },
              { name: 'YouTube', category: 'Entertainment', time: '55m', width: '45%', color: 'bg-chart-5' },
              { name: 'News', category: 'Information', time: '30m', width: '25%', color: 'bg-chart-2' },
              { name: 'Email', category: 'Productivity', time: '20m', width: '15%', color: 'bg-chart-3' },
            ].map(app => (
              <div key={app.name}>
                <div className="flex justify-between items-end mb-1">
                  <div>
                    <span className="text-sm font-medium text-foreground">{app.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{app.category}</span>
                  </div>
                  <span className="text-xs font-medium text-foreground">{app.time}</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${app.color} rounded-full`} style={{ width: app.width }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-xl font-serif-accent text-foreground">Top Website Visits</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Website</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Visits</th>
                <th className="px-6 py-4 font-medium">Time Spent</th>
                <th className="px-6 py-4 font-medium text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { domain: 'github.com', category: 'Development', visits: 45, time: '2h 15m', trend: '+12%', positive: true },
                { domain: 'twitter.com', category: 'Social Media', visits: 32, time: '1h 12m', trend: '-5%', positive: false },
                { domain: 'youtube.com', category: 'Entertainment', visits: 18, time: '55m', trend: '+2%', positive: false },
                { domain: 'notion.so', category: 'Productivity', visits: 12, time: '45m', trend: '+8%', positive: true },
                { domain: 'figma.com', category: 'Productivity', visits: 8, time: '30m', trend: '-2%', positive: false }
              ].map((site, i) => (
                <tr key={i} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-6 bg-secondary rounded flex items-center justify-center text-xs font-bold text-muted-foreground border border-border">
                        {site.domain.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{site.domain}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-secondary text-xs rounded-md border border-border text-muted-foreground">{site.category}</span></td>
                  <td className="px-6 py-4 text-foreground">{site.visits}</td>
                  <td className="px-6 py-4 text-foreground">{site.time}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${site.positive ? 'text-chart-1' : 'text-chart-4'}`}>
                      <span className="material-symbols-outlined text-sm">{site.positive ? 'trending_up' : 'trending_down'}</span>
                      {site.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border flex justify-between items-center bg-secondary/20">
          <span className="text-xs text-muted-foreground">Showing 1-5 of 24 entries</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-medium border border-border bg-background hover:bg-secondary rounded-md transition-colors disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1.5 text-xs font-medium border border-border bg-background hover:bg-secondary rounded-md transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
