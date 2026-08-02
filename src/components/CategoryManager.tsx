import { useState, useEffect, useMemo } from "react";
import { api } from "@/services/api";
import { APP_CATEGORIES } from "@/types";
import { Search } from "lucide-react";
import { toast } from "sonner";
import type { App } from "@/types";

export function CategoryManager() {
  const [apps, setApps] = useState<App[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");

  useEffect(() => {
    api.getAllApps().then(setApps).catch(() => toast.error("Failed to load apps"));
  }, []);

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      if (search && !app.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "All" && app.category !== categoryFilter) return false;
      return true;
    });
  }, [apps, search, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(apps.map((a) => a.category).filter(Boolean));
    return ["All", ...APP_CATEGORIES.filter((c) => cats.has(c))];
  }, [apps]);

  const handleAssign = async (appName: string, category: string) => {
    try {
      await api.setAppCategory(appName, category);
      setApps((prev) => prev.map((a) => (a.name === appName ? { ...a, category } : a)));
    } catch {
      toast.error(`Failed to set category for ${appName}`);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkCategory || selected.size === 0) return;
    try {
      await Promise.all(
        Array.from(selected).map((name) => api.setAppCategory(name, bulkCategory)),
      );
      setApps((prev) =>
        prev.map((a) => (selected.has(a.name) ? { ...a, category: bulkCategory } : a)),
      );
      setSelected(new Set());
      setBulkCategory("");
      toast.success(`Assigned ${selected.size} apps to ${bulkCategory}`);
    } catch {
      toast.error("Failed to bulk assign categories");
    }
  };

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filteredApps.map((a) => a.name)));
  };

  const clearSelection = () => setSelected(new Set());

  return (
    <div className="rounded-none border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">App Categories</h3>
        <span className="text-sm text-muted-foreground">{apps.length} apps</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps..."
            className="w-full h-9 pl-9 pr-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-none">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="h-8 px-2 rounded-none border border-input bg-background text-xs"
          >
            <option value="">Set category...</option>
            {APP_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={!bulkCategory}
            className="h-8 px-3 rounded-none bg-foreground text-background text-xs font-medium disabled:opacity-50"
          >
            Apply
          </button>
          <button onClick={clearSelection} className="h-8 px-3 rounded-none border border-input text-xs">
            Clear
          </button>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground font-medium border-b border-border">
          <button onClick={selectAll} className="text-xs hover:text-foreground">Select all</button>
        </div>
        {filteredApps.map((app) => (
          <div
            key={app.name}
            className={`flex items-center gap-3 px-2 py-2 rounded-none hover:bg-muted transition-colors ${
              selected.has(app.name) ? "bg-muted" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(app.name)}
              onChange={() => toggleSelect(app.name)}
              className="rounded-none border-input"
            />
            <span className="flex-1 text-sm truncate">{app.name}</span>
            <select
              value={app.category || ""}
              onChange={(e) => handleAssign(app.name, e.target.value)}
              className="h-7 px-2 rounded border border-input bg-background text-xs max-w-[140px]"
            >
              <option value="">Uncategorized</option>
              {APP_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        ))}
        {filteredApps.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No apps found</p>
        )}
      </div>
    </div>
  );
}
