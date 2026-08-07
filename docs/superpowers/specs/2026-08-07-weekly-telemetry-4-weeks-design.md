# Design: 4-Week Telemetry Navigation in WeeklyTelemetry

## Overview
Enable browsing 4 weeks of telemetry data (1 current week + 3 past weeks) in the `WeeklyTelemetry` section of the Dashboard screen using left/right navigation arrows.

## User Requirements
- In Dashboard screen in `WeeklyTelemetry`, show 4 weeks (1 current + 3 past weeks).
- Switchable through left and right arrow buttons.

## Proposed Changes

### 1. Rust Backend (`src-tauri/src/database.rs`)
- Modify `get_weekly_stats` in `database.rs` to fetch stats from the past 30 days (`30 * 24 * 60 * 60` seconds) instead of 7 days (`7 * 24 * 60 * 60` seconds).
- This ensures 4 full 7-day relative windows (28 days total + 2-day buffer for timezone boundaries) are returned in `WeeklyStats.days`.

### 2. Dashboard Component (`src/pages/Dashboard.tsx`)
- Update `WeeklyTelemetry` component in `Dashboard.tsx`:
  - Add state `weekOffset` (0 to 3), where:
    - `0`: Current Week (days $t-6$ to $t$)
    - `1`: 1 Week Ago (days $t-13$ to $t-7$)
    - `2`: 2 Weeks Ago (days $t-20$ to $t-14$)
    - `3`: 3 Weeks Ago (days $t-27$ to $t-21$)
  - Render left arrow (`ChevronLeft`) and right arrow (`ChevronRight`) controls in the header.
  - Display the selected week label and formatted date range (e.g. `CURRENT WEEK | Aug 01 - Aug 07`).
  - Disable left arrow when `weekOffset === 3`.
  - Disable right arrow when `weekOffset === 0`.
  - Dynamically slice and map the 7-day window based on `weekOffset`.

## Verification Plan
1. `npm run typecheck` - Verify TypeScript builds without errors.
2. `cd src-tauri && cargo test` - Verify Rust tests pass.
3. Manual verification / UI verification.
