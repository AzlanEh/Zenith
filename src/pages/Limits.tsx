import { CheckCircle2, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppIcon } from "../components/AppIcon";
import { CategoryManager } from "../components/CategoryManager";
import { ErrorBoundary } from "../components/ErrorBoundary";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { useAppLimits, useSetAppLimit } from "../queries";
import { api } from "../services/api";
import { logger } from "../utils/logger";
import type { InstalledApp } from "../types";

export function Limits() {
  const { data: appLimits = [] } = useAppLimits();
  const setAppLimitMutation = useSetAppLimit();
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [displayLimit, setDisplayLimit] = useState(30);

  useEffect(() => {
    setDisplayLimit(30);
    if (!isAddOpen) {
      setSearchQuery("");
      setSelectedApps([]);
      setActiveCategory("All");
    }
  }, [isAddOpen, searchQuery, activeCategory]);

  useEffect(() => {
    api
      .getInstalledApps()
      .then(setInstalledApps)
      .catch((e) => {
        logger.error("Failed to load installed apps:", e);
        toast.error("Failed to load installed apps");
      });
  }, []);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const handleUpdateLimit = async (
    appName: string,
    minutes: number,
    blockWhenExceeded: boolean,
  ) => {
    await setAppLimitMutation.mutateAsync({
      appName,
      minutes,
      blockWhenExceeded,
    });
  };

  // Build name → icon hint map for quick lookup
  const iconMap = useMemo(
    () =>
      new Map<string, string | null>(
        installedApps.map((a) => [a.name.toLowerCase(), a.icon ?? null]),
      ),
    [installedApps],
  );

  const filteredInstalledApps = useMemo(() => {
    return installedApps.filter((app) => {
      const notLimited = !appLimits.find(
        (l) => l.app_name.toLowerCase() === app.name.toLowerCase(),
      );
      const matchesSearch =
        searchQuery === "" ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase());
      return notLimited && matchesSearch;
    });
  }, [installedApps, appLimits, searchQuery]);

  const categoryOptions = useMemo(
    (): string[] => [
      "All",
      ...Array.from(
        new Set(
          filteredInstalledApps
            .map((a) => a.categories?.[0] || "Uncategorized")
            .filter(Boolean),
        ),
      ),
    ],
    [filteredInstalledApps],
  );

  const appsForCategory = useMemo(() => {
    if (activeCategory === "All") return filteredInstalledApps;
    return filteredInstalledApps.filter(
      (app) => (app.categories?.[0] || "Uncategorized") === activeCategory,
    );
  }, [filteredInstalledApps, activeCategory]);

  const displayedApps = useMemo(() => {
    return appsForCategory.slice(0, displayLimit);
  }, [appsForCategory, displayLimit]);

  const handleModalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 300) {
      setDisplayLimit((prev) => Math.min(appsForCategory.length, prev + 30));
    }
  };

  return (
    <ErrorBoundary>
      <div className="p-4 lg:p-8 max-w-5xl mx-auto flex flex-col gap-8 pb-20 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Daily App Limits */}
        <section className="glass-panel p-6 md:p-8 rounded-none">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-serif-accent text-foreground">
                Daily App Limits
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Set maximum daily usage time for specific applications.
              </p>
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <button className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Add App
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-background border-border shadow-2xl flex flex-col max-h-[90vh] p-0 gap-0 overflow-hidden rounded-none [&>button]:hidden">
                {/* Header & Search */}
                <div className="p-8 space-y-6 border-b border-border bg-secondary/10 relative">
                  <div className="flex justify-between items-center">
                    <div>
                      <DialogTitle className="text-3xl font-serif-accent italic leading-none text-foreground">
                        Add Application
                      </DialogTitle>
                      <p className="text-[0.65rem] font-mono uppercase tracking-[0.3em] text-muted-foreground mt-2">
                        Constraint selection module
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddOpen(false)}
                      aria-label="Close dialog"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="w-6 h-6 rotate-45" />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-full bg-secondary/20 border-0 border-b-2 border-border/50 focus:border-primary focus:ring-0 text-foreground pl-12 py-4 text-sm tracking-wide transition-all placeholder:text-muted-foreground outline-none"
                      placeholder="Search apps..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Content Area */}
                <div
                  className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background"
                  onScroll={handleModalScroll}
                >
                  {/* Category Filter Chips */}
                  <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    {categoryOptions.map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`whitespace-nowrap px-4 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest transition-all rounded-none ${
                          activeCategory === category
                            ? "bg-foreground text-background"
                            : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {appsForCategory.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm font-mono uppercase tracking-widest">
                        No applications found
                      </div>
                    ) : (
                      displayedApps.map((app) => {
                        const isSelected = selectedApps.includes(app.name);
                        return (
                          <div
                            key={app.name}
                            onClick={() => {
                              setSelectedApps((prev) =>
                                prev.includes(app.name)
                                  ? prev.filter((n) => n !== app.name)
                                  : [...prev, app.name],
                              );
                            }}
                            className={`flex items-center justify-between p-4 transition-colors group cursor-pointer rounded-none ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary/10 hover:bg-secondary/30 text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-10 h-10 flex items-center justify-center p-1 rounded-none ${isSelected ? "bg-primary-foreground/20" : "bg-background border border-border"}`}
                              >
                                <AppIcon
                                  appName={app.name}
                                  iconHint={app.icon ?? undefined}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div>
                                <span className="text-sm font-medium block">
                                  {app.name}
                                </span>
                                <span
                                  className={`text-[0.6rem] font-mono uppercase tracking-wider opacity-60 ${!isSelected && "text-muted-foreground"}`}
                                >
                                  {app.categories?.[0] || "Uncategorized"}
                                </span>
                              </div>
                            </div>
                            {isSelected ? (
                              <CheckCircle2 className="w-5 h-5 fill-current" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-muted-foreground group-hover:border-primary transition-colors"></div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Footer: Actions */}
                <div className="p-6 md:p-8 bg-secondary/10 border-t border-border flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.65rem] font-mono text-muted-foreground uppercase tracking-wider">
                      {selectedApps.length} application
                      {selectedApps.length !== 1 && "s"} selected
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setIsAddOpen(false)}
                      className="px-6 py-3 text-[0.7rem] font-mono uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={selectedApps.length === 0}
                      onClick={() => {
                        selectedApps.forEach((name) =>
                          handleUpdateLimit(name, 60, true),
                        );
                        setIsAddOpen(false);
                      }}
                      className="px-8 py-3 text-[0.7rem] font-mono uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Selected
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col gap-6">
            {appLimits.length === 0 && (
              <div className="text-center p-8 border border-dashed border-border rounded-none text-muted-foreground">
                <p>No app limits set. Click "Add App" to start.</p>
              </div>
            )}
            {appLimits.map((app) => (
              <div
                key={app.id}
                className={`flex flex-col md:flex-row md:items-center gap-4 p-5 border border-border bg-secondary/10 hover:bg-secondary/30 transition-colors rounded-none ${!app.block_when_exceeded && "opacity-60 grayscale"}`}
              >
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="size-10 bg-background border border-border flex items-center justify-center shrink-0 rounded-none p-1">
                    <AppIcon
                      appName={app.app_name}
                      iconHint={
                        iconMap.get(app.app_name.toLowerCase()) || undefined
                      }
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {app.app_name}
                    </span>
                  </div>
                </div>

                <div className="flex-1 px-2 md:px-6">
                  <div className="flex justify-between mb-2 text-xs font-medium">
                    <span className="text-muted-foreground">0h</span>
                    <span className="text-foreground">
                      {formatTime(app.daily_limit_minutes)} limit
                    </span>
                    <span className="text-muted-foreground">4h</span>
                  </div>
                  <input
                    className="w-full"
                    max={240}
                    min="5"
                    step="5"
                    type="range"
                    value={app.daily_limit_minutes}
                    disabled={!app.block_when_exceeded}
                    onChange={(e) => {
                      // Update optimism
                      handleUpdateLimit(
                        app.app_name,
                        parseInt(e.target.value),
                        app.block_when_exceeded,
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-end min-w-[80px] pt-2 md:pt-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={app.block_when_exceeded}
                      onChange={() => {
                        handleUpdateLimit(
                          app.app_name,
                          app.daily_limit_minutes,
                          !app.block_when_exceeded,
                        );
                      }}
                    />
                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-foreground"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <CategoryManager />
      </div>
    </ErrorBoundary>
  );
}
