# 24-Hour Green Activity Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Intensity Matrix in `src/pages/Analytics.tsx` to display 24 one-hour columns per day with a 5-tier emerald green intensity color scale.

**Architecture:** Update `COLS` to 24 in `src/pages/Analytics.tsx`, map hourly seconds (0..3600s) to 5 green color tiers (0%, 25%, 50%, 75%, 100%), and adjust tooltips, time labels, and legend swatches accordingly.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vitest, Testing Library.

## Global Constraints

- **File**: `src/pages/Analytics.tsx`
- **Columns**: 24 hourly columns (`COLS = 24`), representing 00:00 to 23:00.
- **Color Scale**: Emerald green scale (`bg-muted/20`, `#064e3b`, `#15803d`, `#22c55e`, `#4ade80`).

---

### Task 1: Redesign IntensityMatrix Component in Analytics.tsx

**Files:**
- Modify: `src/pages/Analytics.tsx:164-278`

**Interfaces:**
- Consumes: `useWeeklyHourlyUsage` hook returning `WeeklyHourlyUsage[]` `{ date: string; hour: number; total_seconds: number }`.
- Produces: 24-column 7-day interactive green activity heatmap.

- [ ] **Step 1: Write test for cell color function and hourly column count**

Create `src/pages/Analytics.test.tsx` (if not present) with tests verifying 24 hourly columns and correct tooltip/green color rendering.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Analytics } from "./Analytics";

vi.mock("../queries", () => ({
  useWeeklyStats: () => ({ data: { total_seconds: 7200, days: ["2026-08-08"] } }),
  useDailyStats: () => ({ data: { total_seconds: 3600, apps: [] } }),
  useWeeklyHourlyUsage: () => ({
    data: [
      { date: new Date().toISOString().slice(0, 10), hour: 14, total_seconds: 1800 },
    ],
  }),
}));

vi.mock("../hooks/useFocusHistory", () => ({
  useFocusHistory: () => ({ sessions: [] }),
}));

describe("Analytics Intensity Matrix", () => {
  it("renders 24 hour columns per day", () => {
    render(<Analytics />);
    const cellsRow0 = screen.getAllByTitle(/00:00|14:00/);
    expect(cellsRow0.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify initial state**

Run: `npm run test:run src/pages/Analytics.test.tsx`

- [ ] **Step 3: Update COLS, cellColor, and IntensityMatrix in Analytics.tsx**

Modify `COLS` to 24, update `cellColor` helper to compute emerald green shades based on absolute hourly thresholds (0s, <=900s, <=1800s, <=2700s, >2700s), update time labels (`00:00`, `06:00`, `12:00`, `18:00`, `23:00`), hover tooltip, and 5-swatch legend.

```tsx
const COLS = 24;
const LEGEND_TIERS = [
  { label: "0%", bg: "rgba(255, 255, 255, 0.05)" },
  { label: "25%", bg: "#064e3b" },
  { label: "50%", bg: "#15803d" },
  { label: "75%", bg: "#22c55e" },
  { label: "100%", bg: "#4ade80" },
];

function getGreenIntensityColor(seconds: number): string {
  if (seconds <= 0) return "rgba(255, 255, 255, 0.05)";
  if (seconds <= 900) return "#064e3b";  // 1-15m (25%)
  if (seconds <= 1800) return "#15803d"; // 15-30m (50%)
  if (seconds <= 2700) return "#22c55e"; // 30-45m (75%)
  return "#4ade80";                      // 45m+ (100%)
}
```

- [ ] **Step 4: Run tests and typecheck to verify pass**

Run: `npm run typecheck && npm run test:run src/pages/Analytics.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Analytics.tsx src/pages/Analytics.test.tsx
git commit -m "feat(analytics): redesign hourly heatmap to 24-hour green color scale"
```
