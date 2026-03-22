

export function Settings() {
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full space-y-6 lg:space-y-8 pb-20">
      
      {/* Profile Section */}
      <section className="glass-panel p-8 rounded-2xl">
        <h3 className="text-xl font-serif-accent text-foreground mb-6">Profile</h3>
        <div className="flex flex-col sm:flex-row items-start gap-8">
          <div className="relative group cursor-pointer flex-shrink-0">
            <img
              alt="Avatar"
              className="size-24 rounded-full object-cover border-2 border-border"
              src="https://ui-avatars.com/api/?name=Azlan&background=random"
            />
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-white">edit</span>
            </div>
          </div>
          
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">First Name</label>
              <input
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                type="text"
                defaultValue="Azlan"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Last Name</label>
              <input
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                type="text"
                defaultValue=""
                placeholder="Doe"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                type="email"
                defaultValue="azlan@example.com"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
               <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                 Save Changes
               </button>
            </div>
          </div>
        </div>
      </section>

      {/* Focus Preferences */}
      <section className="glass-panel p-8 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-serif-accent text-foreground">Focus Preferences</h3>
            <p className="text-sm text-muted-foreground mt-1">Customize your ideal working environment.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Default Focus Duration */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-border/50">
            <div>
              <h4 className="font-medium text-foreground">Default Focus Session</h4>
              <p className="text-xs text-muted-foreground">Standard duration for Pomodoro timers</p>
            </div>
            <select className="bg-background border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 outline-none">
              <option value="25">25 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </div>

          {/* Strict Mode */}
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <h4 className="font-medium text-foreground">Strict Mode</h4>
              <p className="text-xs text-muted-foreground">Blocks exiting Focus Mode once started</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

           {/* Block Notifications */}
           <div className="flex items-center justify-between py-3">
            <div>
              <h4 className="font-medium text-foreground">Mute Notifications</h4>
              <p className="text-xs text-muted-foreground">Automatically silence alerts during focus</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="glass-panel p-8 rounded-2xl">
        <h3 className="text-xl font-serif-accent text-foreground mb-6">Notifications</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="size-10 rounded-full bg-chart-1/10 flex items-center justify-center text-chart-1">
                 <span className="material-symbols-outlined text-xl">self_improvement</span>
               </div>
               <div>
                 <h4 className="font-medium text-foreground text-sm">Mindful Reminders</h4>
                 <p className="text-xs text-muted-foreground">Gentle nudges to take a breath</p>
               </div>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="size-10 rounded-full bg-chart-2/10 flex items-center justify-center text-chart-2">
                 <span className="material-symbols-outlined text-xl">coffee</span>
               </div>
               <div>
                 <h4 className="font-medium text-foreground text-sm">Break Suggestions</h4>
                 <p className="text-xs text-muted-foreground">When you've been working too long</p>
               </div>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="glass-panel p-8 rounded-2xl border-destructive/20 bg-destructive/5">
        <h3 className="text-xl font-serif-accent text-destructive mb-6">Danger Zone</h3>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-destructive/10">
            <div>
              <h4 className="font-medium text-foreground">Clear All Data</h4>
              <p className="text-xs text-muted-foreground mt-1">Permanently remove all your analytics and focus history.</p>
            </div>
            <button className="px-4 py-2 border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors text-sm font-medium rounded-lg whitespace-nowrap">
              Clear Data
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
            <div>
              <h4 className="font-medium text-foreground">Delete Account</h4>
              <p className="text-xs text-muted-foreground mt-1">This action cannot be undone. All data will be lost.</p>
            </div>
            <button className="px-4 py-2 bg-destructive text-white hover:bg-destructive/90 transition-colors text-sm font-medium rounded-lg whitespace-nowrap">
              Delete Account
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
