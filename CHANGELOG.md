# Changelog

All notable changes to this project are documented in this file. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.2.0] - 2026-08-02

### Added

- Onboarding wizard (`init_onboarding_goals`)
- Goals v2: editor modal, list, achievements panel
- Focus schedules editor (`FocusScheduleEditor`)
- Category manager (`CategoryManager`)
- Emergency access (5/10/15 min temporary bypass of hard blocks)
- Import usage data (CSV/JSON)
- In-app issue report dialog (pre-filled GitHub issue)
- Background headless mode (`run_background`, autostart)
- Auto-updater (check/download/install, `latest.json` endpoint)
- System tray (minimize, quick actions)
- CI workflow + release workflow (quality gates, artifacts, signing)
- PR and bug report templates
- Vitest setup: config, test utilities, factories, setup file
- Playwright e2e specs aligned with current navigation
- A11y: skip link, improved sidebar toggle labels

### Changed

- Brutalist redesign: semantic design tokens, oklch color space, 0px border radius
- Fonts: Inter (body), Newsreader (headings), Geist Mono (data/timers)
- Material symbols bundled locally for offline icons
- Improved app icon fallback matching heuristics
- Bumped `active-win-pos-rs` 0.9 → 0.11
- Updated Tauri app icons, Linux PKGBUILD and desktop file
- Moved project docs under `docs/`; added `DESIGN.md`

### Fixed

- Autostart: only fall back to XDG autostart when systemd is unavailable
- Settings: safe defaults when loading fails
- Updater: install action and structured Linux errors
- Linux theme icon resolution
- Onboarding: pass `mindfulnessSessions` argument to `initOnboardingGoals`
- Focus: invalidate `focusSettings` query cache on blocklist mutation

### Security

- Split updater into dedicated capability
- Fixed cargo audit vulnerabilities; stripped build from CI

## [0.1.5] - 2026-03-23

Initial tagged release (Zenith v0.1.5).
