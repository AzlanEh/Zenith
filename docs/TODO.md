# Zenith — Improvement Roadmap

Tracks the path from v0.1.5 → v0.2.0 and beyond. Status: **v0.2.0 tagged and released**.

---

## Shipped in v0.2.0 & Unreleased Post-v0.2.0

- [x] Onboarding wizard (`init_onboarding_goals`)
- [x] Goals v2: editor modal, list, achievements panel
- [x] Focus schedules editor (`FocusScheduleEditor`)
- [x] Category manager (`CategoryManager`)
- [x] Emergency access (5/10/15 min bypass)
- [x] Import usage data (CSV/JSON)
- [x] In-app issue report dialog (pre-filled GitHub issue)
- [x] Brutalist redesign: semantic design tokens, oklch, 0px radius, Newsreader/Geist Mono
- [x] Background headless mode (`run_background`, autostart)
- [x] Auto-updater (check/download/install, `latest.json` endpoint)
- [x] System tray (minimize, quick actions)
- [x] CI (`.github/workflows/ci.yml`) + release workflow (`release.yml`) + PR/issue templates
- [x] Rust: `WellbeingError`, migrations system, tracing, atomic `record_usage`
- [x] 4-week telemetry navigation in `WeeklyTelemetry` dashboard (30-day API query range)
- [x] Single-instance process lock (`tauri-plugin-single-instance`)
- [x] SQLite Migration 3 for session deduplication & DB performance
- [x] Windows UWP app scanning, `.lnk` target resolution, and native icon extraction
- [x] App blocking on Windows by window title in addition to process name
- [x] Excluded Zenith background process (`zenith-dw`) from usage telemetry

## v0.2.0 release gate — COMPLETED

1. [x] Fix lint: `npm run lint` passing clean
2. [x] Add `CHANGELOG.md` (Keep a Changelog format) summarizing v0.1.6 → v0.2.0
3. [x] Bump version to 0.2.0 in all three places: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`
4. [x] Verify release workflow end-to-end (tag `v0.2.0` pushed and built)
5. [x] Verify `cargo clippy --all-targets --all-features -- -D warnings` + `cargo fmt --check`
6. [x] Post-release smoke test: dashboard, settings, update check, tray, background mode

## Cleanup backlog (from repo audit 2026-08)

- [x] Remove dead custom-theme subsystem: `theme.rs`, `get_theme`/`get_theme_path` commands, `queries/useTheme.ts`, `api.getTheme*` (useDarkMode is the real theme)
- [x] Remove dead commands not exposed to frontend: `cleanup_old_data`, `get_storage_stats` (also `parse_retention_days` + tests)
- [x] Remove dead query hooks: `useTheme`, `useAppCategory`, `useCategoryUsage`, `useRemoveGoal` (also `api.removeGoal`, `api.getCategoryUsage`)
- [x] Remove unused `AchievementsPanel.tsx`
- [x] Move `format_export_csv`/`format_export_json` + CSV escaping from Rust to TS
- [x] Collapse 3 duplicate `ProgressBar` implementations into one
- [x] Inline `useFocusTimerStore` into FocusMode page (single consumer)
- [x] Replace `once_cell` with `std::sync::LazyLock`
- [x] Drop dead `_mindfulness_sessions` param on `init_onboarding_goals`

## Planned for v0.3.0 Roadmap

### Advanced Analytics & Insights
- [ ] Hourly activity heatmap visualization on Dashboard & History pages
- [ ] Cognitive load & context-switching frequency score calculations
- [ ] Week-over-week category comparison charts & shift detection
- [ ] Extended telemetry history retention controls (> 90 days optional archive)

### Custom Notification Rules & Focus Modes
- [ ] Per-category custom alert thresholds & Do Not Disturb override rules
- [ ] Friction-based focus mode bypass (e.g. countdown delay or challenge question before emergency unblock)
- [ ] Custom Pomodoro break schedule presets (25/5, 50/10, custom work/rest ratios)
- [ ] Audio/visual ambient break indicators

### Platform & OS Improvements
- [ ] Native macOS window tracking & bundle target support
- [ ] Advanced Wayland window focus detection improvements (Hyprland / Sway IPC enhancements)
- [ ] System tray live status badge (remaining focus timer / active usage)

## Deferred

- [ ] Multiple profiles (work/personal, auto-switch) — not now
- [ ] Android/iOS builds — not now

---

*Last updated: 2026-08-08*
