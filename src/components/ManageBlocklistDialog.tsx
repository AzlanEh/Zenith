import { memo, useState, useMemo, useEffect } from "react";
import { Search, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { AppIcon } from "./AppIcon";
import type { InstalledApp } from "../types";

interface ManageBlocklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFocusActive: boolean;
  installedApps: InstalledApp[];
  blockedAppsList: string[];
  onAddBlockedApp: (appName: string) => Promise<void>;
}

export const ManageBlocklistDialog = memo(function ManageBlocklistDialog({
  open,
  onOpenChange,
  isFocusActive,
  installedApps,
  blockedAppsList,
  onAddBlockedApp,
}: ManageBlocklistDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [displayLimit, setDisplayLimit] = useState(30);

  useEffect(() => {
    setDisplayLimit(30);
    if (!open) {
      setSearchQuery("");
      setSelectedCategory("All");
    }
  }, [open, searchQuery, selectedCategory]);

  const blockedSet = useMemo(() => new Set(blockedAppsList), [blockedAppsList]);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    for (const app of installedApps) {
      const cat = app.categories?.[0] || "Uncategorized";
      set.add(cat);
    }
    return Array.from(set);
  }, [installedApps]);

  const availableApps = useMemo(() => {
    return installedApps.filter((app) => !blockedSet.has(app.name));
  }, [installedApps, blockedSet]);

  const filteredApps = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return availableApps.filter((app) => {
      const matchesSearch = !q || app.name.toLowerCase().includes(q);
      const cat = app.categories?.[0] || "Uncategorized";
      const matchesCategory = selectedCategory === "All" || cat === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [availableApps, searchQuery, selectedCategory]);

  const displayedApps = useMemo(() => {
    return filteredApps.slice(0, displayLimit);
  }, [filteredApps, displayLimit]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 300) {
      setDisplayLimit((prev) => Math.min(filteredApps.length, prev + 30));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-2 border-border shadow-2xl flex flex-col max-h-[85vh] p-0 gap-0 overflow-hidden rounded-none [&>button]:hidden">
        {/* Header & Search */}
        <div className="p-6 sm:p-8 space-y-4 border-b border-border bg-card relative">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[0.65rem] uppercase tracking-[0.2em] font-mono text-muted-foreground block mb-1">
                Access Control Module
              </span>
              <DialogTitle className="text-2xl sm:text-3xl font-serif italic text-foreground">
                Manage App Blocklist
              </DialogTitle>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close dialog"
              className="p-2 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-border cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              className="w-full bg-background border border-border p-3 pl-11 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors rounded-none"
              placeholder="Search application by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Chips */}
          {categories.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-[0.65rem] font-mono uppercase tracking-wider transition-colors shrink-0 border rounded-none cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-foreground text-background border-foreground font-bold"
                      : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Apps List */}
        <div
          className="flex-1 overflow-y-auto p-6 sm:p-8 bg-background space-y-2"
          onScroll={handleScroll}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted-foreground font-bold">
              Available Applications ({filteredApps.length})
            </span>
            <span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted-foreground font-bold">
              {blockedAppsList.length} Blocked
            </span>
          </div>

          {filteredApps.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground font-mono text-xs uppercase tracking-widest border border-dashed border-border p-6">
              {availableApps.length === 0
                ? "All installed apps are currently blocked"
                : "No matching applications found"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedApps.map((app) => (
                <button
                  key={app.name}
                  onClick={() => onAddBlockedApp(app.name)}
                  disabled={isFocusActive}
                  className="flex items-center justify-between p-3 bg-card hover:bg-secondary/40 border border-border hover:border-primary transition-all text-left group rounded-none disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 bg-background border border-border flex items-center justify-center shrink-0 rounded-none p-1 group-hover:border-foreground transition-colors">
                      <AppIcon
                        appName={app.name}
                        iconHint={app.icon ?? undefined}
                        className="w-full h-full object-contain"
                        shape="rounded-none"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {app.name}
                      </p>
                      <p className="text-[0.65rem] font-mono text-muted-foreground uppercase tracking-wider truncate">
                        {app.categories?.[0] || "Application"}
                      </p>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 ml-2 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-card border-t border-border flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="px-6 py-2.5 bg-foreground text-background text-xs font-mono tracking-widest uppercase hover:bg-foreground/90 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
