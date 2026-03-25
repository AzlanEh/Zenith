import { memo } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Focus,
  BarChart2,
  ShieldAlert,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";

export type Page = "dashboard" | "focus" | "analytics" | "limits" | "settings";

interface SidebarProps {
  isOpen: boolean;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

export const Sidebar = memo(function Sidebar({ isOpen, currentPage, setCurrentPage }: SidebarProps) {
  return (
    <aside
      className={cn(
        "w-64 lg:w-72 flex-shrink-0 flex flex-col border-r border-border bg-card h-screen sticky top-0 z-50 transition-transform duration-300 absolute lg:relative",
        !isOpen && "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-primary flex items-center justify-center rounded-lg shadow-sm">
          <Sparkles className="text-primary-foreground w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-serif-accent font-bold tracking-tight text-foreground">
            ZenFocus
          </h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Digital Wellbeing
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 flex flex-col gap-1 overflow-y-auto">
        <button
          onClick={() => setCurrentPage("dashboard")}
          className={cn(
            "flex items-center gap-3 px-4 py-3 group transition-all rounded-r-md border-l-2",
            currentPage === "dashboard"
              ? "bg-secondary text-foreground border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent",
          )}
        >
          <LayoutDashboard
            className={cn(
              "w-5 h-5",
              currentPage === "dashboard"
                ? "text-foreground"
                : "group-hover:text-foreground transition-colors",
            )}
          />
          <span className="font-medium text-sm">Dashboard</span>
        </button>
        <button
          onClick={() => setCurrentPage("focus")}
          className={cn(
            "flex items-center gap-3 px-4 py-3 group transition-all rounded-r-md border-l-2",
            currentPage === "focus"
              ? "bg-secondary text-foreground border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent",
          )}
        >
          <Focus
            className={cn(
              "w-5 h-5",
              currentPage === "focus"
                ? "text-foreground"
                : "group-hover:text-foreground transition-colors",
            )}
          />
          <span className="font-medium text-sm">Focus Mode</span>
        </button>
        <button
          onClick={() => setCurrentPage("analytics")}
          className={cn(
            "flex items-center gap-3 px-4 py-3 group transition-all rounded-r-md border-l-2",
            currentPage === "analytics"
              ? "bg-secondary text-foreground border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent",
          )}
        >
          <BarChart2
            className={cn(
              "w-5 h-5",
              currentPage === "analytics"
                ? "text-foreground"
                : "group-hover:text-foreground transition-colors",
            )}
          />
          <span className="font-medium text-sm">Analytics</span>
        </button>
        <button
          onClick={() => setCurrentPage("limits")}
          className={cn(
            "flex items-center gap-3 px-4 py-3 group transition-all rounded-r-md border-l-2",
            currentPage === "limits"
              ? "bg-secondary text-foreground border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent",
          )}
        >
          <ShieldAlert
            className={cn(
              "w-5 h-5",
              currentPage === "limits"
                ? "text-foreground"
                : "group-hover:text-foreground transition-colors",
            )}
          />
          <span className="font-medium text-sm">App Limits</span>
        </button>
        <button
          onClick={() => setCurrentPage("settings")}
          className={cn(
            "flex items-center gap-3 px-4 py-3 group transition-all rounded-r-md border-l-2",
            currentPage === "settings"
              ? "bg-secondary text-foreground border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent",
          )}
        >
          <SettingsIcon
            className={cn(
              "w-5 h-5",
              currentPage === "settings"
                ? "text-foreground"
                : "group-hover:text-foreground transition-colors",
            )}
          />
          <span className="font-medium text-sm">Settings</span>
        </button>
      </nav>

      {/*<div className="p-4 mt-auto">
        <div className="bg-secondary/50 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-full bg-chart-1/20 border border-chart-1/30 flex items-center justify-center overflow-hidden">
               <img src="https://ui-avatars.com/api/?name=Azlan&background=random" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Azlan</p>
              <p className="text-xs text-muted-foreground">Pro Plan</p>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-card border border-border rounded-lg transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>*/}
    </aside>
  );
});
