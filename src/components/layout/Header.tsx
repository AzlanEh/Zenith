import React from 'react';
import { Menu, Search, Bell, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  toggleTheme: () => void;
  isDark: boolean;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Header({ 
  toggleSidebar, 
  toggleTheme, 
  isDark,
  title = "Good morning, Azlan",
  subtitle = "Here is your wellness overview for today.",
  children
}: HeaderProps) {
  return (
    <header className="h-16 lg:h-20 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 lg:px-8 shrink-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl lg:text-3xl font-serif-accent font-bold text-foreground tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs lg:text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        {children ? children : (
          <>
            <div className="hidden md:flex relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="h-9 w-64 bg-secondary/50 border border-transparent focus:border-border focus:bg-background rounded-full pl-9 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/70"
              />
            </div>
            
            <button 
              onClick={toggleTheme}
              className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <button className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 size-2 bg-destructive rounded-full border-2 border-background"></span>
            </button>
            
            <button className="size-9 rounded-full bg-chart-1/20 border border-chart-1/30 flex items-center justify-center text-chart-1 font-bold text-sm ml-2 overflow-hidden">
              <img src="https://ui-avatars.com/api/?name=Azlan&background=random" alt="Avatar" className="w-full h-full object-cover" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
