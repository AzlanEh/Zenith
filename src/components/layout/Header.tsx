import React, { memo } from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  sidebarOpen: boolean;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const Header = memo(function Header({ 
  toggleSidebar, 
  sidebarOpen,
  title = "Good morning, Azlan",
  subtitle = "Here is your wellness overview for today.",
  children
}: HeaderProps) {
  return (
    <header className="h-16 lg:h-20 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 lg:px-8 shrink-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl lg:text-3xl font-serif-accent font-bold text-foreground tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs lg:text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      
      {children && (
        <div className="flex items-center gap-2 sm:gap-4">
          {children}
        </div>
      )}
    </header>
  );
});
