# Zenith — Improvement Roadmap

Tracks the path from v0.1.5 → v0.2.0 and beyond. Status: **v0.2.0 in progress** (49 commits ahead of v0.1.5, not yet tagged).

---

## Shipped since v0.1.5

- [x] Onboarding wizard (`init_onboarding_goals`)
- [x] Goals v2: editor modal, list, achievements panel
- [x] Focus schedules editor (`FocusScheduleEditor`)
- [x] Category manager (`CategoryManager`)
- [x] Emergency access (5/10/15 min bypass)
- [x] Import usage data (CSV/JSON)
- [x] In-app issue report dialog (pre-filled GitHub issue)
- [x] Brutaist redesign: semantic design tokens, oklch, 0px radius, Newsreader/Geist Mono
- [x] Background headless mode (`run_background`, autostart)
- [x] Auto-updater (check/download/install, `latest.json` endpoint)
- [x] System tray (minimize, quick actions)
- [x] CI (`.github/workflows/ci.yml`) + release workflow (`release.yml`) + PR/issue templates
- [x] Rust: `WellbeingError`, migrations system, tracing, atomic `record_usage`

## v0.2.0 release gate — BLOCKERS

1. [x] Fix lint: `npm run lint` fails with **1796 errors, 81 warnings** (blocked release)
2. [x] Add `CHANGELOG.md` (Keep a Changelog format) summarizing v0.1.6 → v0.2.0
3. [x] Bump version to 0.2.0 in all three places: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`
4. [ ] Verify release workflow end-to-end (tag `v0.2.0` dry-run: quality gates, artifacts, signing secrets present) — gates pass locally (lint/typecheck/vitest/cargo test/clippy/fmt), signing secrets present in repo; remaining: actual `v0.2.0` tag push
5. [x] Verify `cargo clippy --all-targets --all-features -- -D warnings` + `cargo fmt --check`
6. [ ] Post-release smoke test: dashboard, settings, update check, tray, background mode

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

## Deferred

- [ ] Multiple profiles (work/personal, auto-switch) — not now
- [ ] Android/iOS builds — not now

---

*Last updated: 2026-08-02*
