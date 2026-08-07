# 4-Week Telemetry Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to navigate through 4 weeks (1 current + 3 past weeks) of telemetry data in the `WeeklyTelemetry` section of the Dashboard using left and right arrow buttons.

**Architecture:** Extend backend `get_weekly_stats` SQL date range from 7 days to 30 days so that up to 4 full weeks of daily totals are fetched. Add a `weekOffset` state (0 to 3) and navigation controls (`ChevronLeft`, `ChevronRight`) in `WeeklyTelemetry` on the Dashboard frontend to slice and display the selected 7-day window.

**Tech Stack:** React 19, Lucide React, Rust (Tauri / SQLite rusqlite, chrono).

## Global Constraints
- Monochrome brutalist UI styling consistent with `DESIGN.md` (no rounded borders, uppercase font-mono labels).
- Grayscale colors with CSS variables (`var(--border)`, `var(--card)`, `var(--primary)`, `var(--foreground)`, `var(--muted)`).
- Left arrow disabled at `weekOffset === 3`, Right arrow disabled at `weekOffset === 0`.

---

### Task 1: Update Rust Backend for 30-Day Telemetry Query

**Files:**
- Modify: `src-tauri/src/database.rs:388-418`

**Interfaces:**
- Consumes: None
- Produces: `get_weekly_stats(&self) -> SqliteResult<Vec<(i64, i64)>>` returning daily totals for up to 30 days.

- [ ] **Step 1: Update `get_weekly_stats` cutoff in `database.rs`**

Modify line 389 in `src-tauri/src/database.rs`:
```rust
    pub fn get_weekly_stats(&self) -> SqliteResult<Vec<(i64, i64)>> {
        let week_ago = Utc::now().timestamp() - (30 * 24 * 60 * 60);
```

- [ ] **Step 2: Run Cargo tests to verify backend compilation and tests**

Run: `cd src-tauri && cargo test`
Expected: PASS

- [ ] **Step 3: Commit backend changes**

Run:
```bash
git add src-tauri/src/database.rs
git commit -m "feat(backend): expand get_weekly_stats range to 30 days for 4-week telemetry"
```

---

### Task 2: Implement 4-Week Navigation in `WeeklyTelemetry` (`Dashboard.tsx`)

**Files:**
- Modify: `src/pages/Dashboard.tsx:2-11` (Imports), `src/pages/Dashboard.tsx:222-307` (`WeeklyTelemetry` component)

**Interfaces:**
- Consumes: `WeeklyStats.days` array from `useWeeklyStats()` query.
- Produces: Interactive `WeeklyTelemetry` component with `ChevronLeft` and `ChevronRight` week switching.

- [ ] **Step 1: Import `ChevronLeft` and `ChevronRight` in `Dashboard.tsx`**

In `src/pages/Dashboard.tsx`:
```tsx
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Cpu,
  List,
  Lock,
  Medal,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
```

- [ ] **Step 2: Update `WeeklyTelemetry` implementation with `weekOffset` state & navigation UI**

In `src/pages/Dashboard.tsx`, replace `WeeklyTelemetry` with:

```tsx
function WeeklyTelemetry({
  days,
}: {
  days: { date: string; total_seconds: number }[];
}) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, 1..3 = past weeks

  const bars = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const d of days) dayMap.set(d.date, d.total_seconds / 3600);

    const result: { day: string; fullDate: string; hours: number; filled: boolean }[] = [];
    // weekOffset 0: days (today-6) to today
    // weekOffset 1: days (today-13) to (today-7)
    // weekOffset 2: days (today-20) to (today-14)
    // weekOffset 3: days (today-27) to (today-21)
    const endOffset = weekOffset * 7;
    const startOffset = endOffset + 6;

    for (let i = startOffset; i >= endOffset; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en", { weekday: "short" });
      const hours = dayMap.get(key) ?? 0;
      result.push({ day: dayLabel, fullDate: key, hours, filled: hours > 0 });
    }
    return result;
  }, [days, weekOffset]);

  const dateRangeLabel = useMemo(() => {
    if (bars.length === 0) return "";
    const startDate = new Date(bars[0].fullDate);
    const endDate = new Date(bars[bars.length - 1].fullDate);
    const fmt = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "2-digit" });
    return `${fmt(startDate)} - ${fmt(endDate)}`;
  }, [bars]);

  const weekTitle = useMemo(() => {
    if (weekOffset === 0) return "Current Week";
    if (weekOffset === 1) return "1 Week Ago";
    return `${weekOffset} Weeks Ago`;
  }, [weekOffset]);

  const maxHours = Math.max(...bars.map((b) => b.hours), 1);

  return (
    <section className="p-6 md:p-8 bg-card border-b border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-xs tracking-[0.1em] uppercase text-foreground border-b border-border pb-1 font-bold">
            Weekly Activity
          </h2>
          <BarChart3 className="text-muted-foreground w-4 h-4" />
        </div>
        <div className="flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.1em]">
          <span className="text-muted-foreground border border-border px-2 py-1 bg-background">
            {weekTitle} ({dateRangeLabel})
          </span>
          <div className="flex items-center border border-border bg-background">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => Math.min(3, w + 1))}
              disabled={weekOffset >= 3}
              className="p-1 hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              type="button"
              onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
              disabled={weekOffset <= 0}
              className="p-1 hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {days.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground text-center py-16">
          No data available
        </p>
      ) : (
        <>
          <div className="h-56 sm:h-64 flex items-end justify-between gap-2 border-b border-border pb-2 relative">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${(i / 4) * 100}%`,
                  borderTop: "1px dashed var(--border)",
                }}
              />
            ))}
            {bars.map((bar, i) => {
              const heightPct = (bar.hours / maxHours) * 100;
              const isHovered = hoveredBar === i;
              return (
                <div
                  key={bar.fullDate}
                  className="flex-1 relative cursor-pointer transition-all duration-200"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: bar.filled
                      ? isHovered
                        ? "var(--primary)"
                        : "var(--foreground)"
                      : "transparent",
                    border: bar.filled ? "none" : "1px solid var(--border)",
                    ...(!bar.filled && isHovered
                      ? { backgroundColor: "var(--muted)" }
                      : {}),
                  }}
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {isHovered && (
                    <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[0.625rem] bg-popover text-popover-foreground border border-border px-1.5 py-0.5 whitespace-nowrap top-[-1.75rem] z-20">
                      {bar.hours.toFixed(1)}h ({bar.fullDate})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between font-mono text-[0.625rem] text-muted-foreground uppercase tracking-[0.1em] mt-2">
            {bars.map((b) => (
              <span key={b.fullDate}>{b.day}</span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Run TypeScript typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit frontend changes**

Run:
```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(dashboard): add 4-week telemetry navigation buttons to WeeklyTelemetry"
```
