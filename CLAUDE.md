# Zenith

Desktop app for tracking and limiting screen time. Built with Tauri 2 (Rust backend + SQLite, React 19 frontend).

## Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite
- **State/Data**: Zustand, TanStack Query v5
- **UI**: lucide-react, sonner, recharts, Radix UI primitives
- **Backend**: Rust, Tauri 2, rusqlite, tokio
- **Testing**: Vitest, @testing-library/react, Playwright E2E
- **Styling**: Tailwind v4 with CSS variables, dark mode via `.dark` class

## Architecture

- Tauri commands in `src-tauri/src/lib.rs` bridge frontend ↔ backend
- SQLite database managed via migrations in `src-tauri/src/migrations.rs`
- Frontend data fetching via custom hooks in `src/queries/`
- Global app state via Zustand store in `src/store/`
- Window tracking monitors active windows (Hyprland/Sway/X11)

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type check + Vite build |
| `npm run typecheck` | TypeScript type check |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | Vitest single run |
| `npm run lint` | ESLint |
| `npm run tauri` | Tauri CLI |

## Rust commands

| Command | Description |
|---------|-------------|
| `cd src-tauri && cargo test` | Run all Rust tests |
| `cd src-tauri && cargo clippy` | Lint Rust code |

## Conventions

- Import path aliases via `@/` → `src/`
- Type imports use `import type`
- React Query hooks in `src/queries/` follow `use{Resource}` / `useUpdate{Resource}` pattern
- Rust error types use `WellbeingError` enum
- All user-facing strings should NOT be hardcoded in components (move to constants)
- App names are sanitized before DB storage (`sanitize_app_name` in `window_tracker.rs`)
- Use `logger.error()` instead of `console.error()`

## Design reference

See `DESIGN.md` for typography (Inter/Newsreader/Geist Mono) and visual style guide.
