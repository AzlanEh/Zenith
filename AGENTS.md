# Zenith — Agent Reference

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server (port **1420** strict, HMR on 1421 via `TAURI_DEV_HOST`) |
| `npm run build` | `tsc && vite build` — typecheck then build frontend |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint — `eslint src` |
| `npm run test` | Vitest **watch** mode |
| `npm run test:run` | Vitest **single run** |
| `npm run test:coverage` | Vitest with v8 coverage (thresholds: stmts 20%, branches 10%, funcs 15%, lines 20%) |
| `npm run test:e2e` | Playwright — auto-starts Vite, needs `npm run dev` port 1420 |
| `npm run tauri` | Tauri CLI passthrough |
| `npm run tauri:build` | `NO_STRIP=1 tauri build` |
| `cd src-tauri && cargo test` | Rust tests (CI uses `--all-features`) |
| `cd src-tauri && cargo clippy` | `--all-targets --all-features -- -D warnings` |
| `cd src-tauri && cargo fmt --all -- --check` | Rust formatting check |

**Pre-commit** (husky): `lint-staged` (eslint --fix + typecheck on staged `.ts/.tsx`) then `cargo fmt --check` if Rust files changed.

## Architecture

```
src/                  React 19 frontend
  services/api.ts     invoke() wrappers for all Tauri commands
  queries/            TanStack Query v5 hooks (re-exported from index.ts)
  store/              Zustand stores (useUIStore, useFocusTimerStore)
  utils/logger.ts     Custom logger: logger.error() in prod, warn/info DEV-only
  lib/utils.ts        cn() = twMerge(clsx(inputs))
src-tauri/src/        Rust backend
  lib.rs              Entrypoint, all #[tauri::command] definitions, AppState
  database.rs         SQLite ops via rusqlite
  window_tracker.rs   Active window detection (Hyprland/Sway/X11)
```

## Stack specifics

- **Tailwind v4** via `@tailwindcss/vite` plugin — no `tailwind.config.js` or PostCSS
- **Dark mode** via `.dark` class on `<html>`, toggled by `useDarkMode` hook
- **CSS**: oklch color space, `--radius: 0rem` (brutalist — no rounded corners)
- **Fonts**: Inter (body), Newsreader (headings), Geist Mono (data/timers) — loaded via `@fontsource/*`
- **Path alias**: `@/` → `src/`
- **shadcn/ui**: new-york style, zinc base, components in `src/components/ui/`
- **ESLint**: `no-console` allows `warn`/`error` only; `@typescript-eslint/no-explicit-any` is `warn`
- **Rust logging**: `tracing` crate (subscribe in `init_tracing()`)
- **No generated/prisma code** — raw SQL with rusqlite, hand-written migrations in `migrations.rs`

## Key conventions

- Use `import type` for type-only imports
- Query hooks: `use{Resource}` / `useUpdate{Resource}` pattern in `src/queries/`
- User-facing strings → constants, not inline in components
- App names sanitized via `sanitize_app_name()` before DB insert
- Rust errors: `WellbeingError` enum (thiserror + serde::Serialize for Tauri)
- App name validation: only alphanumeric, space, hyphen, underscore, dot; max 256 chars

## Gotchas

- **DB location**: `$XDG_DATA_HOME/zenith/zenith.db` (usually `~/.local/share/zenith/zenith.db`)
- **Data retention**: 90 days — automatic cleanup runs on app startup
- **Background mode**: `run_background()` for headless autostart (no GUI window)
- **Emergency access**: tempoary 5/10/15 min bypass of hard app blocks
- **Export**: CSV/JSON only, must use absolute path, file must NOT already exist
- **Data wipe**: requires `"DELETE"` confirmation string
- **CSP is strict**: must update `tauri.conf.json` CSP if adding external resources
- **Playwright E2E** expects Vite on port 1420 (auto-started by config)
- **Husky**: setup via `"prepare": "husky"` in package.json
- **Test files**: `src/**/*.{test,spec}.{ts,tsx}`, Vitest with jsdom, setup at `src/test/setup.ts`
- **Onboarding**: stored in `localStorage` key `onboarding_completed`
- **Security audit**: `npm run security:check` runs npm audit (prod) + cargo audit

## Design

Brutalist monochrome — see `DESIGN.md`. Zero border-radius, tonal layering over shadows, grayscale with muted teal chart accents.
