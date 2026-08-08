# Hourly Activity Heatmap (24-Hour Green Scale) Design Spec

## Overview
Redesign the Intensity Matrix on the Analytics page (`src/pages/Analytics.tsx`) to use a 24-column hourly grid (00:00 to 23:00) with a 5-tier emerald green intensity color scale corresponding to 0%, 25%, 50%, 75%, and 100% hourly usage thresholds.

## Requirements & Behavior

### 1. Grid Layout
- **Columns (`COLS = 24`)**: Representing 24 hours in a day (0 to 23).
- **Rows (7 Days)**: Past 6 days + Today.
- **Lookup Key**: `${dateStr}-${hour}` mapping to total seconds spent in that hour (0 to 3600s).

### 2. Green Color Intensity Scale
Cell background colors calculated based on absolute hourly duration:

| Tier | Usage Range | Percentage | Color Hex | Tailwind / CSS |
|------|-------------|------------|-----------|----------------|
| 0 | 0 seconds | 0% | `--muted/20` | `bg-muted/20 border border-border/30` |
| 1 | 1s - 900s (1 - 15m) | 25% | `#064e3b` | `bg-emerald-950` |
| 2 | 901s - 1800s (15 - 30m) | 50% | `#15803d` | `bg-emerald-700` |
| 3 | 1801s - 2700s (30 - 45m) | 75% | `#22c55e` | `bg-emerald-500` |
| 4 | 2701s - 3600s+ (45 - 60m) | 100% | `#4ade80` | `bg-emerald-400` |

### 3. UI Elements & Tooltips
- **Time Labels**: `00:00`, `06:00`, `12:00`, `18:00`, `23:00`.
- **Legend**: 5 swatches labeled `0%`, `25%`, `50%`, `75%`, `100%`.
- **Tooltip**: Displays `${dayLabel} ${hour}:00 - ${hour + 1}:00 — ${formatDuration(seconds)}` on hover.

## Self-Review Verification
- No TBDs or placeholders.
- Internal consistency: 24 columns match backend `hour` range (0..23).
- Scope: Single focused component update in `src/pages/Analytics.tsx`.
