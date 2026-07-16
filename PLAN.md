# Zenith Improvement Plans

> **Planned at**: commit `06565b1`, 2026-07-16  
> **Status**: Plans only — no code changes yet. Each plan is self-contained and
> ordered by dependency. Run them in sequence; later plans may depend on earlier
> ones.

---

## Execution order & status

| # | Title | Priority | Effort | Depends on | Status |
|---|-------|----------|--------|------------|--------|
| 1 | Fix frontend test infrastructure | P1 | S | — | TODO |
| 2 | Fix undefined spread crash in `useUpdateFocusSettings` and `useUpdateNotificationSettings` | P1 | S | — | TODO |
| 3 | Add `refetchInterval` to dashboard queries | P1 | S | — | TODO |
| 4 | Sanitize `extract_app_name` output for DB safety | P1 | S | — | TODO |
| 5 | Fix CSV import quoting for round-trip data fidelity | P1 | S | — | TODO |
| 6 | Fix TOCTOU symlink race in `save_export_file` | P1 | S | — | TODO |
| 7 | Validate focus schedule times in `set_focus_settings` | P2 | S | — | TODO |
| 8 | Add in-progress session handling to `get_weekly_stats` | P2 | S | — | TODO |
| 9 | Add missing index on `usage_sessions.start_time` | P2 | S | — | TODO |
| 10 | Reduce `useBlockedAppCheck` poll interval | P2 | S | — | TODO |
| 11 | Reduce `useBreakTimer` poll interval | P2 | S | — | TODO |
| 12 | Replace `console.error` with logger utility | P2 | S | — | TODO |
| 13 | Remove `ensure_schema_columns` | P2 | S | — | TODO |
| 14 | Fix duplicate theme resolution in `useDarkMode` | P3 | S | — | TODO |
| 15 | Remove empty `useEffect` in `FocusMode.tsx` | P3 | S | — | TODO |
| 16 | Move `intervalId` into Zustand store state | P3 | S | — | TODO |
| 17 | Un-exclude test files from `tsconfig.json` | P3 | S | — | TODO |
| 18 | Add defense-in-depth sanitization to `block_app_linux` | P3 | S | 4 | TODO |
| 19 | Wire onboarding prefs into app initial state | P3 | M | — | TODO |
| 20 | Remove ThemeCustomizer (no effect, contradicts DESIGN.md) | P3 | S | — | TODO |
| 21 | Persist focus session notes to SQLite | P3 | M | — | TODO |
| 22 | Consolidate `settings_store.rs` test/prod duplication | P3 | M | — | TODO |
| 23 | Fix `PendingWrite::RecordSession` silent data loss | P3 | M | 1 | TODO |
| 24 | Remove `#[allow(dead_code)]` on unused error variants | P3 | S | — | TODO |
| 25 | Add DESIGN.md fonts to package.json | P3 | S | — | TODO |
| 26 | Consolidate icon libraries (lucide-react only) | P3 | M | — | TODO |
| 27 | Create CLAUDE.md for AI tooling | P3 | S | — | TODO |

---

## Plan 1: Fix frontend test infrastructure

### Why this matters
100% of Vitest tests fail because `src/test/setup.ts` is referenced in `vitest.config.ts`
but the file does not exist. This blocks all frontend testing and makes CI coverage
reporting pointless. CI currently reports nothing for frontend tests.

### Current state
- `vitest.config.ts:16` — `setupFiles: ["./src/test/setup.ts"]`
- `src/test/` — directory exists and is empty
- `npm run test:run` — 2 suites fail with `Error: Cannot find module '.../src/test/setup.ts'`
- `@testing-library/jest-dom` is in `devDependencies` at `package.json:72`

### Scope
**In scope**: `src/test/setup.ts` (create)
**Out of scope**: Writing actual tests, fixing test file typechecking

### Steps

#### Step 1: Create `src/test/setup.ts`
Create the file with content:
```ts
import "@testing-library/jest-dom/vitest";
```

#### Step 2: Verify
```bash
npm run test:run
```
Expected: both suites now pass (or at minimum, the setup error is gone and tests execute).

```bash
npm run typecheck
```
Expected: exit 0, no new type errors.

### Done criteria
- [ ] `npm run test:run` exits 0 (or tests run past setup phase)
- [ ] `npm run typecheck` exits 0
- [ ] No files outside in-scope list are modified

---

## Plan 2: Fix undefined spread crash in `useUpdateFocusSettings` and `useUpdateNotificationSettings`

### Why this matters
Both mutation hooks use `getQueryData(...)` with a non-null assertion (`!`). If the
initial query hasn't resolved yet (race on quick toggle), `getQueryData` returns
`undefined` and spreading `undefined` throws `TypeError: Cannot convert undefined or null to object`.
This crashes the `ErrorBoundary`-wrapped Settings page silently — the feature breaks
with no user feedback.

### Current state
**`src/queries/useFocusSettings.ts:15-16`**:
```ts
mutationFn: (updates: Partial<FocusSettings>) =>
  api.setFocusSettings({ ...queryClient.getQueryData<FocusSettings>(["focusSettings"])!, ...updates } as FocusSettings),
```

**`src/queries/useNotificationSettings.ts:15-16`**: identical pattern.

### Scope
**In scope**: `src/queries/useFocusSettings.ts`, `src/queries/useNotificationSettings.ts`
**Out of scope**: Other query hooks (they use regular `useQuery` with `queryFn` only, no spread)

### Steps

#### Step 1: Fix `useFocusSettings.ts`
Replace the spread with a nullish coalescing default:
```ts
mutationFn: (updates: Partial<FocusSettings>) => {
  const current = queryClient.getQueryData<FocusSettings>(["focusSettings"]);
  return api.setFocusSettings({ ...(current ?? {} as FocusSettings), ...updates });
},
```

#### Step 2: Fix `useNotificationSettings.ts`
Same pattern:
```ts
mutationFn: (updates: Partial<NotificationSettings>) => {
  const current = queryClient.getQueryData<NotificationSettings>(["notificationSettings"]);
  return api.setNotificationSettings({ ...(current ?? {} as NotificationSettings), ...updates });
},
```

#### Step 3: Verify
```bash
npm run typecheck
```
Expected: exit 0.

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] No `!.` pattern with `getQueryData` remains in `src/queries/`
- [ ] Only the two specified files are modified

---

## Plan 3: Add `refetchInterval` to dashboard queries

### Why this matters
All 13 query hooks rely solely on `staleTime: 30_000` + window-focus refetch for
freshness. A user watching their dashboard sees stale data for the entire session
if they don't switch away and back. The TODO.md (item 6) claims "increased interval
to 30 seconds" but this only changed `staleTime`, not actual polling.

### Current state
`src/main.tsx` creates `QueryClient` with:
```ts
{ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } } }
```
No query hook sets `refetchInterval`.

### Approach
Add `refetchInterval: 30_000` to the `QueryClient` defaults so all queries
automatically poll. This is a single-line change and avoids having to touch
13 individual query files. The 30s interval matches the existing `staleTime`.

### Scope
**In scope**: `src/main.tsx`
**Out of scope**: Individual query files

### Steps

#### Step 1: Add `refetchInterval` to QueryClient defaults
In `src/main.tsx`, change:
```ts
{ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } } }
```
to:
```ts
{ defaultOptions: { queries: { staleTime: 30_000, refetchInterval: 30_000, refetchOnWindowFocus: true } } }
```

#### Step 2: Verify
```bash
npm run typecheck
```
Expected: exit 0.

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] Only `src/main.tsx` is modified

---

## Plan 4: Sanitize `extract_app_name` output for DB safety

### Why this matters
`extract_app_name()` in `window_tracker.rs` passes unsanitized window titles
(user-controlled text from the X11/Wayland window system) directly to
`get_or_create_app()` which stores them in the SQLite `apps.name` column.

Window titles can contain characters like `+`, `;`, `|`, `"` that fail
`is_valid_app_name()`. These apps then appear in the UI usage list but cannot be
targeted by any Tauri command (`set_app_limit`, `remove_app_limit`, `quit_blocked_app`)
which all validate via `is_valid_app_name()`.

The static mapping at `window_tracker.rs` explicitly returns `"Notepad++"` (contains `+`),
which is a real, unblockable app.

### Current state
`window_tracker.rs:559`:
```rust
// Generic fallback: capitalize first letter
let app_name = capitalize_first(window_name);
```
This runs after the mapping table; any window title not in the map gets stored as-is.

### Scope
**In scope**: `src-tauri/src/window_tracker.rs`
**Out of scope**: `tracker.rs` (the caller), `database.rs`

### Steps

#### Step 1: Add sanitization after `extract_app_name` determines the name
After `extract_app_name` produces its result (the `capitalize_first` fallback or
the mapping lookup), filter to only characters valid for `is_valid_app_name`:
alphanumeric, space, hyphen, underscore, dot.

Add a helper:
```rust
fn sanitize_app_name(name: &str) -> Option<String> {
    let sanitized: String = name
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == ' ' || *c == '-' || *c == '_' || *c == '.')
        .collect();
    if sanitized.is_empty() || sanitized.len() > 256 { None } else { Some(sanitized) }
}
```

#### Step 2: Apply sanitization at the end of `extract_app_name`
Before the final return (after all branches resolve a name), pipe through
`sanitize_app_name`. If it returns `None`, return `None` from `extract_app_name`.

#### Step 3: Fix the `Notepad++` mapping
In `APP_MAPPINGS` or `EXACT_MATCH_MAP`, change `"Notepad++"` → `"NotepadPlusPlus"`
or `"Notepad"`. One string change.

#### Step 4: Add tests
Add `#[cfg(test)]` tests for:
- Normal name passes through unchanged
- Name with `+` gets stripped
- Name with `;rm -rf /` gets stripped to empty → returns `None`
- `Notepad++` (if still in mapping) gets sanitized to `NotepadPlusPlus` or similar
- Empty after sanitization returns `None`

#### Step 5: Verify
```bash
cd src-tauri && cargo test
```
Expected: all 47+ existing tests pass + new tests pass.
```bash
cargo clippy
```
Expected: no new warnings.

### Done criteria
- [ ] `cd src-tauri && cargo test` exits 0
- [ ] `cd src-tauri && cargo clippy -- -D warnings` exits 0
- [ ] `Notepad++` mapping changed
- [ ] `sanitize_app_name` function exists and has tests

---

## Plan 5: Fix CSV import quoting for round-trip data fidelity

### Why this matters
The Rust CSV export (`format_export_csv`) properly wraps fields containing commas
or quotes in double quotes (RFC 4180). The JavaScript CSV import splits each line
by `,` without handling quoted fields. Re-importing an exported CSV that has commas
in app names or categories produces corrupted records (wrong column alignment).

### Current state
**`DataImport.tsx:33`**:
```ts
const cols = line.split(",");
```
This splits `"Hello, World",Development,3600` into `['"Hello', ' World"', 'Development', ...]`
instead of `['Hello, World', 'Development', ...]`.

### Scope
**In scope**: `src/components/DataImport.tsx`
**Out of scope**: `src-tauri/src/lib.rs` (export side is correct), other import paths

### Approach
Replace the naive `split(",")` with a simple state-machine parser that handles
double-quoted fields per RFC 4180. A proper CSV parser like `papaparse` is
overkill for this single use; a ~20-line function will do.

### Steps

#### Step 1: Add a `parseCsvLine` helper
```ts
function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cols.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}
```

#### Step 2: Replace `line.split(",")` with `parseCsvLine(line)`
In `DataImport.tsx:33`, change:
```ts
const cols = line.split(",");
```
to:
```ts
const cols = parseCsvLine(line);
```

#### Step 3: Strip surrounding quotes from parsed fields
After `parseCsvLine`, trim whitespace but also handle the case where the import
may have already stripped outer quotes. The Rust export produces `"Hello, World"`
(quotes included). The split by comma from the naive parser puts `"Hello` as one
field. With the new parser, the field is `Hello, World` (no outer quotes).

The existing `.trim()` calls on each field are fine. No additional unquoting
is needed because the parser strips the outer quotes naturally.

#### Step 4: Verify
```bash
npm run typecheck
```
Expected: exit 0.
```bash
npm run test:run
```
Expected: tests pass (after Plan 1 is done).

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] `npm run test:run` exits 0 (test infrastructure must be fixed first)
- [ ] A comment documents the RFC 4180 parser intent
- [ ] Only `src/components/DataImport.tsx` is modified

---

## Plan 6: Fix TOCTOU symlink race in `save_export_file`

### Why this matters
The `save_export_file` function checks if the target path is a symlink, then writes
to it. Between the check and the write, an attacker with write access to the export
directory could replace the target with a symlink to an arbitrary file the user owns.
This is a classic Time-of-Check-Time-of-Use (TOCTOU) vulnerability.

### Current state
**`src-tauri/src/lib.rs:464-473`**:
```rust
if canonical_path.exists() {
    let metadata = std::fs::symlink_metadata(&canonical_path)?;
    if metadata.file_type().is_symlink() {
        return Err(WellbeingError::Export("Refusing to write export file through a symlink".into()));
    }
}
std::fs::write(canonical_path, content)?;
```

### Scope
**In scope**: `src-tauri/src/lib.rs`
**Out of scope**: Other file operations

### Approach
Use `OpenOptions` with `create_new(true)` to atomically create the file without
following symlinks (on Linux, `O_CREAT | O_EXCL` fails if the file exists at all,
even as a symlink). This eliminates the check-then-write window entirely.

### Steps

#### Step 1: Replace `fs::write` with atomic create
Replace the post-check `fs::write` block:
```rust
std::fs::write(canonical_path, content)?;
```
with:
```rust
use std::fs::OpenOptions;
use std::io::Write;

let mut file = OpenOptions::new()
    .write(true)
    .create_new(true)  // Fails if path exists (breaks symlink following)
    .open(&canonical_path)
    .map_err(|e| {
        if e.kind() == std::io::ErrorKind::AlreadyExists {
            WellbeingError::Export("Export file already exists. Remove it first or choose a different name.".into())
        } else {
            WellbeingError::Io(e)
        }
    })?;
file.write_all(content.as_bytes())?;
```

#### Step 2: Remove the pre-check symlink logic
The pre-check block (lines 464-471) becomes unnecessary — `create_new(true)`
handles the TOCTOU race atomically. Remove the `if canonical_path.exists() { ... }`
block and its symlink check.

However, keep the `canonicalize()` check to ensure the parent directory exists
and the path is absolute (lines 451-462). That validation is still valuable.

#### Step 3: Verify
```bash
cd src-tauri && cargo test
```
Expected: all tests pass.
```bash
cd src-tauri && cargo clippy -- -D warnings
```
Expected: no warnings.

### Done criteria
- [ ] `cd src-tauri && cargo test` exits 0
- [ ] `cd src-tauri && cargo clippy -- -D warnings` exits 0
- [ ] `create_new(true)` is used instead of `fs::write`
- [ ] Pre-check symlink block is removed

---

## Plan 7: Validate focus schedule times in `set_focus_settings`

### Why this matters
`FocusSchedule` contains `start_time` and `end_time` as free strings. The
`is_active_at` method uses `.ok()` on `NaiveTime::parse_from_str`, silently
returning `false` on parse failure. A user who enters "9:00" instead of "09:00"
sees their schedule never activate, with zero feedback. No validation exists at
the `set_focus_settings` Tauri command boundary.

### Current state
**`focus_mode.rs:71-72`**:
```rust
let start = NaiveTime::parse_from_str(&self.start_time, "%H:%M").ok();
let end = NaiveTime::parse_from_str(&self.end_time, "%H:%M").ok();
```
Parse failure → `None` → `is_active_at` returns `false`.

**`lib.rs:727-730`**: `set_focus_settings` accepts `FocusSettings` directly via
serde deserialization with no custom validation.

### Scope
**In scope**: `src-tauri/src/focus_mode.rs` (add validation), `src-tauri/src/lib.rs` (wire it)
**Out of scope**: Frontend validation

### Steps

#### Step 1: Add validation method to `FocusSchedule`
```rust
impl FocusSchedule {
    /// Validate time format. Returns Ok if both start_time and end_time parse as HH:MM.
    pub fn validate(&self) -> Result<(), String> {
        NaiveTime::parse_from_str(&self.start_time, "%H:%M")
            .map_err(|_| format!("Invalid start_time '{}': expected HH:MM format", self.start_time))?;
        NaiveTime::parse_from_str(&self.end_time, "%H:%M")
            .map_err(|_| format!("Invalid end_time '{}': expected HH:MM format", self.end_time))?;
        for &day in &self.days {
            if day > 6 {
                return Err(format!("Invalid day value {}: must be 0-6 (Sunday-Saturday)", day));
            }
        }
        Ok(())
    }
}
```

#### Step 2: Wire validation into `update_settings`
In `focus_mode.rs` in `update_settings`:
```rust
pub async fn update_settings(&self, settings: FocusSettings) {
    // Validate all schedules before accepting
    for schedule in &settings.schedules {
        if let Err(e) = schedule.validate() {
            tracing::warn!(error = %e, schedule = %schedule.name, "Invalid focus schedule rejected");
            // Currently logs and still accepts — change to return Result
        }
    }
    *self.settings.lock().await = settings.clone();
    // ...
}
```

But `update_settings` currently returns `()`. To return an error, change the
signature to return `Result<(), WellbeingError>` and propagate to the Tauri command.

#### Step 3: Update `update_settings` signature
```rust
pub async fn update_settings(&self, settings: FocusSettings) -> Result<(), WellbeingError> {
    for schedule in &settings.schedules {
        schedule.validate().map_err(|e| WellbeingError::Other(format!("Schedule '{}': {}", schedule.name, e)))?;
    }
    *self.settings.lock().await = settings.clone();
    if let Err(e) = crate::settings_store::save_focus_settings(&settings) {
        tracing::warn!(error = %e, "Failed to persist focus settings");
    }
    Ok(())
}
```

#### Step 4: Update the Tauri command in `lib.rs`
```rust
#[tauri::command]
async fn set_focus_settings(state: State<'_, AppState>, settings: FocusSettings) -> CmdResult<()> {
    state.focus_manager.update_settings(settings).await
}
```

#### Step 5: Add tests
```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_validate_valid_schedule() {
        let schedule = FocusSchedule { start_time: "09:00".into(), end_time: "17:00".into(), days: vec![1,2,3,4,5], enabled: true, .. };
        assert!(schedule.validate().is_ok());
    }

    #[test]
    fn test_validate_bad_time_format() {
        let schedule = FocusSchedule { start_time: "9:00".into(), end_time: "17:00".into(), days: vec![1], enabled: true, .. };
        assert!(schedule.validate().is_err());
    }

    #[test]
    fn test_validate_bad_day_value() {
        let schedule = FocusSchedule { start_time: "09:00".into(), end_time: "17:00".into(), days: vec![7], enabled: true, .. };
        assert!(schedule.validate().is_err());
    }
}
```

#### Step 6: Verify
```bash
cd src-tauri && cargo test
```
Expected: new + existing tests pass.
```bash
cd src-tauri && cargo clippy -- -D warnings
```
Expected: clean.

### Done criteria
- [ ] `cd src-tauri && cargo test` exits 0
- [ ] `cd src-tauri && cargo clippy -- -D warnings` exits 0
- [ ] `update_settings` returns `Result<(), WellbeingError>`
- [ ] New validation tests pass

---

## Plan 8: Add in-progress session handling to `get_weekly_stats`

### Why this matters
`get_weekly_stats` computes `SUM(duration_seconds)` directly, without the
`CASE WHEN` in-progress computation used by 8 other query methods. An ongoing
session (started but not yet 5-second-flushed) has `duration_seconds = 0` and
reports 0 for today in the weekly chart. The duplicate `CASE WHEN` is also tech
debt (8 copies of the same expression).

### Current state
**`database.rs:402-429`** — `get_weekly_stats`:
```sql
SELECT DATE(start_time, 'unixepoch', 'localtime') as day, SUM(duration_seconds)
FROM usage_sessions WHERE start_time >= ?1 GROUP BY day ORDER BY day ASC
```

Compare with `get_daily_usage` at line 371:
```sql
SUM(CASE WHEN us.duration_seconds = 0 AND us.end_time = us.start_time AND us.start_time > strftime('%s','now') - 15
         THEN MAX(strftime('%s','now') - us.start_time, 0)
         ELSE us.duration_seconds END)
```

### Scope
**In scope**: `src-tauri/src/database.rs` (fix `get_weekly_stats`)

### Steps

#### Step 1: Add the CASE WHEN to `get_weekly_stats`
Replace the `SUM(duration_seconds)` in `get_weekly_stats` with the same
`CASE WHEN` pattern used in `get_daily_usage`:
```sql
SELECT DATE(start_time, 'unixepoch', 'localtime') as day,
       SUM(CASE WHEN duration_seconds = 0 AND end_time = start_time AND start_time > strftime('%s','now') - 15
                THEN MAX(strftime('%s','now') - start_time, 0)
                ELSE duration_seconds END)
FROM usage_sessions WHERE start_time >= ?1 GROUP BY day ORDER BY day ASC
```

#### Step 2: Verify
```bash
cd src-tauri && cargo test
```
Expected: all tests pass.

### Done criteria
- [ ] `cd src-tauri && cargo test` exits 0
- [ ] The CASE WHEN expression is present in `get_weekly_stats`

---

## Plan 9: Add missing index on `usage_sessions.start_time`

### Why this matters
Every date-range query on `usage_sessions` does a full table scan. As the database
grows (the app runs for months), queries like `export_usage_data`, `get_daily_totals_in_range`,
`get_weekly_stats`, and `cleanup_old_data` get progressively slower.

### Current state
`database.rs` — `usage_sessions` has no indexes beyond the implicit primary key
index on `id`. Only `apps(name)` and `apps(category)` are indexed (added by migration).

### Scope
**In scope**: `src-tauri/src/migrations.rs` (add migration)
**Out of scope**: `database.rs` (indexes are managed in migrations)

### Steps

#### Step 1: Add migration for the new indexes
In `src-tauri/src/migrations.rs`, add a new migration (after the latest existing one):
```rust
migrations.push(Migration {
    version: 3, // or whatever the next version is
    description: "Add indexes on usage_sessions for date-range queries",
    sql: "CREATE INDEX IF NOT EXISTS idx_usage_sessions_start_time ON usage_sessions(start_time);
          CREATE INDEX IF NOT EXISTS idx_usage_sessions_app_start ON usage_sessions(app_id, start_time);",
});
```

Check the current latest migration version in `migrations.rs` first and increment accordingly.

#### Step 2: Verify
```bash
cd src-tauri && cargo test
```
Expected: all tests pass (including migration ordering tests).

### Done criteria
- [ ] `cd src-tauri && cargo test` exits 0
- [ ] New migration exists with version N+1
- [ ] Indexes don't break any existing query (no functional change)

---

## Plan 10: Reduce `useBlockedAppCheck` poll interval

### Why this matters
The hook polls `api.getBlockedApps()` every 3 seconds (20 IPC calls/minute).
The backend already emits `blocked-app-detected` Tauri events in real time
(via `emit_blocked_event` at `tracker.rs:566`). The poll is only needed as a
recovery mechanism if the event is missed. A 15-second interval is sufficient
for recovery while cutting IPC overhead by 80%.

### Current state
**`useBlockedAppCheck.ts:57`**: `const id = setInterval(poll, 3000);`

### Scope
**In scope**: `src/hooks/useBlockedAppCheck.ts`

### Steps

#### Step 1: Change poll interval
```ts
const id = setInterval(poll, 15000);
```

#### Step 2: Verify
```bash
npm run typecheck
```
Expected: exit 0.

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] Only the interval value in `useBlockedAppCheck.ts` is changed

---

## Plan 11: Reduce `useBreakTimer` poll interval

### Why this matters
`useBreakTimer` calls `api.getBreakStatus()` + `api.getBreakSettings()` every 1
second (2 IPC calls/second). The backend break reminder ticks at 60-second
intervals (`lib.rs:1248`). A 5-10 second poll is more than sufficient; the
local countdown effect (`setLocalSeconds`) handles second-level precision.

### Current state
**`useBreakTimer.ts:49`**: `const id = setInterval(poll, 1000);`

### Scope
**In scope**: `src/hooks/useBreakTimer.ts`

### Steps

#### Step 1: Change poll interval
```ts
const id = setInterval(poll, 5000);
```

#### Step 2: Verify
```bash
npm run typecheck
```
Expected: exit 0.

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] Only the interval value in `useBreakTimer.ts` is changed

---

## Plan 12: Replace `console.error` with logger utility

### Why this matters
12 `console.error` calls in production files leak internal state (app names,
error messages) to any user with devtools open. While not a security vulnerability,
it's poor UX and a privacy concern.

### Current state
`console.error(...)` spread across `Settings.tsx`, `Limits.tsx`, `FocusMode.tsx`,
and `ErrorBoundary.tsx`.

### Scope
**In scope**: `src/utils/logger.ts` (create), all files with `console.error`
**Out of scope**: `console.log`, `console.warn`

### Steps

#### Step 1: Create `src/utils/logger.ts`
```ts
const DEV = import.meta.env.DEV;

export const logger = {
  error: (...args: unknown[]) => {
    if (DEV) {
      console.error(...args);
    }
    // In production, could send to a logging endpoint or toast
  },
  warn: (...args: unknown[]) => {
    if (DEV) console.warn(...args);
  },
  info: (...args: unknown[]) => {
    if (DEV) console.info(...args);
  },
};
```

#### Step 2: Replace all `console.error` calls
Find all 12 occurrences and replace `console.error(` → `logger.error(`:

Files to update:
- `src/pages/Settings.tsx:163,169,191,204,242,277`
- `src/pages/Limits.tsx:40`
- `src/pages/FocusMode.tsx:95,108,119,142`
- `src/components/ErrorBoundary.tsx:24`

#### Step 3: Verify
```bash
npm run typecheck
```
Expected: exit 0.

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] No `console.error` calls remain in `src/`
- [ ] `src/utils/logger.ts` exists

---

## Plan 13: Remove `ensure_schema_columns`

### Why this matters
`ensure_schema_columns` runs 3 `ALTER TABLE` statements on every database open.
Each returns "duplicate column name" errors that are caught by string matching.
The migration system (`run_migrations`) already handles schema evolution, and
`init_schema` already includes the columns in `CREATE TABLE IF NOT EXISTS`.
This is dead startup overhead.

### Current state
**`database.rs:196-221`**: `ensure_schema_columns()` method called in `Database::new()` at line 121.

### Scope
**In scope**: `src-tauri/src/database.rs`
**Out of scope**: migrations.rs, lib.rs

### Steps

#### Step 1: Remove the `ensure_schema_columns` call from `Database::new()`
Delete line 121: `db.ensure_schema_columns()?;`

#### Step 2: Remove the `ensure_schema_columns` method itself
Delete the method block (lines 196-221, or wherever it is).

#### Step 3: Verify
```bash
cd src-tauri && cargo test
```
Expected: all 47 tests pass.
```bash
cd src-tauri && cargo clippy -- -D warnings
```
Expected: clean.

### Done criteria
- [ ] `cd src-tauri && cargo test` exits 0
- [ ] `cd src-tauri && cargo clippy -- -D warnings` exits 0
- [ ] `ensure_schema_columns` function removed from `database.rs`
- [ ] No references to `ensure_schema_columns` remain

---

## Plan 14: Fix duplicate theme resolution in `useDarkMode`

### Why this matters
`useDarkMode` computes `resolvedTheme` in the initial state (constructor-time call
to `getStoredTheme()` and `getSystemTheme()`), then the `useEffect` re-computes it
on mount. This means the DOM class is applied twice, with a potential brief flash
before the effect runs.

### Current state
**`useDarkMode.ts:19-21`**:
```ts
const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
  getStoredTheme() === "system" ? getSystemTheme() : getStoredTheme() as "light" | "dark"
);
```
Then the same logic in `useEffect` at lines 23-29.

### Scope
**In scope**: `src/hooks/useDarkMode.ts`

### Steps

#### Step 1: Derive `resolvedTheme` from `theme` using `useMemo`
Remove `setResolvedTheme` from state entirely. Compute it:
```ts
const resolvedTheme = useMemo<"light" | "dark">(
  () => theme === "system" ? getSystemTheme() : theme,
  [theme]
);
```

#### Step 2: Apply DOM class in the same `useEffect` that watches `theme`
The existing `useEffect` already applies the class. Just remove the `setResolvedTheme(effectiveTheme)` line inside it.

#### Step 3: Update return type
The hook returns `{ theme, resolvedTheme, setTheme, isDark }`. The type of
`resolvedTheme` stays `"light" | "dark"`.

#### Step 4: Verify
```bash
npm run typecheck
```
Expected: exit 0.

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] `resolvedTheme` is computed via `useMemo`, not stored in state
- [ ] `setResolvedTheme` state setter removed

---

## Plan 15: Remove empty `useEffect` in `FocusMode.tsx`

### Why this matters
Dead code that is confusing to read.

### Current state
**`FocusMode.tsx:75`**: `useEffect(() => {}, [isSettingsOpen, settings]);`

### Scope
**In scope**: `src/pages/FocusMode.tsx`

### Steps

#### Step 1: Delete the empty `useEffect` block
Remove lines: `useEffect(() => {}, [isSettingsOpen, settings]);`

#### Step 2: Remove unused imports
If `useEffect` is no longer used after removal, remove it from the React import
at the top of the file. Check first — it may still be used elsewhere.

#### Step 3: Verify
```bash
npm run typecheck
```
Expected: exit 0.
```bash
npm run lint
```
Expected: no new issues (no `unused import` errors).

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] Empty `useEffect` deleted

---

## Plan 16: Move `intervalId` into Zustand store state

### Why this matters
`useFocusTimerStore` has a module-level `let intervalId` variable shared across
all React component instances. If the app ever needs two independent focus timers
(e.g., a timer widget in the sidebar + the focus page), they would interfere.
Moving it into the store ensures each store instance has its own interval.

### Current state
**`useFocusTimerStore.ts:20`**: `let intervalId: ReturnType<typeof setInterval> | null = null;`

### Scope
**In scope**: `src/store/useFocusTimerStore.ts`
**Out of scope**: `src/pages/FocusMode.tsx` (no API change)

### Steps

#### Step 1: Add `intervalId` to the store state interface
```ts
interface FocusTimerState {
  state: FocusState;
  timeLeft: number;
  totalTime: number;
  _intervalId: ReturnType<typeof setInterval> | null;
  setState: (state: FocusState) => void;
  // ...
}
```

#### Step 2: Initialize to `null` in the store default
```ts
export const useFocusTimerStore = create<FocusTimerState>((set, get) => ({
  state: "idle",
  timeLeft: defaultFocusTime,
  totalTime: defaultFocusTime,
  _intervalId: null,
  // ...
}));
```

#### Step 3: Update `startTick` and `clearTick` to use store state
`startTick` should set `_intervalId` in the store. `clearTick` should read
`get()._intervalId` and clear it. Use a helper that operates on the store's
`set` and `get` functions.

#### Step 4: Remove the module-level `intervalId`
Delete the `let intervalId` declaration at line 20.

#### Step 5: Verify
```bash
npm run typecheck
```
Expected: exit 0.

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] No module-level `intervalId` variable
- [ ] Interval ID is stored in Zustand state

---

## Plan 17: Un-exclude test files from `tsconfig.json`

### Why this matters
`tsconfig.json` excludes `**/*.test.ts` and `**/*.test.tsx` from typechecking.
`npm run typecheck` (which runs `tsc --noEmit`) cannot catch type errors in
test files. Combined with the fact that Vitest tests don't run normally (Plan 1),
this means test files have zero type safety.

### Current state
**`tsconfig.json:29`**: `"exclude": ["**/*.test.ts", "**/*.test.tsx"]`

### Scope
**In scope**: `tsconfig.json`

### Steps

#### Step 1: Remove the exclude patterns
Change:
```json
"exclude": ["**/*.test.ts", "**/*.test.tsx"],
```
to:
```json
"exclude": [],
```
or simply remove the `"exclude"` line.

#### Step 2: Verify
```bash
npm run typecheck
```
Expected: exit 0. If existing test files have type errors, fix them (the two
existing test files are basic and should pass).

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] `tsconfig.json` no longer excludes test files

---

## Plan 18: Add defense-in-depth sanitization to `block_app_linux`

### Why this matters
`block_app` in `tracker.rs` currently relies on Tauri command-level validation
(`is_valid_app_name`) to ensure only safe app names reach `block_app_linux`.
If a future code path calls `block_app` directly without validation, the
`pkill -f` and `xdotool` commands could receive arbitrary regex metacharacters
from window title data. Adding sanitization inside `block_app` makes it safe
at the callee level regardless of caller.

### Current state
**`tracker.rs:579-601`**: `block_app` calls `block_app_linux(app_lower, app_name)`
where `app_lower = app_name.to_lowercase()`. The `app_lower` value flows into
`pkill -f` and `xdotool` commands without escaping.

**`lib.rs:291-299`**: `quit_blocked_app` validates with `is_valid_app_name` before
calling `tracker.block_app(&app_name)`.

### Scope
**In scope**: `src-tauri/src/tracker.rs`
**Out of scope**: `lib.rs`, `window_tracker.rs`

### Steps

#### Step 1: Add validation call inside `block_app`
At the start of `block_app`, validate `app_name` with `is_valid_app_name`. If it
fails, log the attempt and return early instead of running the shell commands.

Add the import for `is_valid_app_name` (it's in `lib.rs` — either move it to a
shared location like `error.rs`, or make a helper module).

A simpler approach: duplicate the validation inline:
```rust
pub fn block_app(&self, app_name: &str) {
    // Defense-in-depth: ensure app name is safe for shell commands
    if app_name.is_empty() || app_name.len() > 256 || !app_name.chars().all(|c| c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' || c == '.') {
        tracing::warn!(app = %app_name, "Refusing to block app with invalid name");
        return;
    }
    // ... rest of function
}
```

#### Step 2: Verify
```bash
cd src-tauri && cargo test
```
Expected: all tests pass.
```bash
cd src-tauri && cargo clippy -- -D warnings
```
Expected: clean.

### Done criteria
- [ ] `cd src-tauri && cargo test` exits 0
- [ ] `cd src-tauri && cargo clippy -- -D warnings` exits 0
- [ ] `block_app` validates app name before shell ops

---

## Plan 19: Wire onboarding prefs into app initial state

### Why this matters
The `OnboardingWizard` collects user preferences (daily goal, break interval,
focus goal, screen limit, mindfulness sessions) and saves them to localStorage
under `"onboarding_prefs"`. The main app never reads this value. After onboarding,
the app initializes hardcoded default goals (240min daily limit, 120min deep work)
from `goals.rs`, ignoring everything the user just set.

### Current state
**`OnboardingWizard.tsx:25-36`** saves to localStorage. No code reads `"onboarding_prefs"`.

**`goals.rs:180-240`**: `GoalsState::new()` initializes 5 hardcoded goals.

### Scope
**In scope**: `src-tauri/src/goals.rs` (accept optional initial goals from frontend),
`src/services/api.ts` or `src/queries/useGoals.ts` (send onboarding prefs),
`src/components/OnboardingWizard.tsx` (pass prefs on completion)

### Steps

#### Step 1: Add `init_goals_from_onboarding` command to Rust backend
In `lib.rs`, add a Tauri command:
```rust
#[tauri::command]
async fn init_goals_from_onboarding(
    state: State<'_, AppState>,
    daily_goal_minutes: i32,
    // other fields...
) -> CmdResult<()> {
    let mut goals_state = state.goals_state.lock().await;
    goals_state.goals.clear();
    // Add goals based on onboarding preferences
    goals_state.add_goal(Goal {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Daily Screen Time Limit".to_string(),
        goal_type: GoalType::DailyLimit,
        target_minutes: daily_goal_minutes,
        // ...
    });
    Ok(())
}
```

#### Step 2: Call this from the frontend after onboarding completes
In `OnboardingWizard.tsx`, in the `onComplete` handler, call the Tauri command
with the collected preferences.

#### Step 3: Verify
```bash
cd src-tauri && cargo test
```
Expected: all tests pass.
```bash
npm run typecheck
```
Expected: exit 0.

### Done criteria
- [ ] `cd src-tauri && cargo test` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] Onboarding preferences result in corresponding goals

---

## Plan 20: Remove ThemeCustomizer

### Why this matters
`ThemeCustomizer` has no effect on the actual app rendering — it saves to
`localStorage` only, with no backend command to apply the theme (explicitly noted
in a `// ponytail:` comment). It also contradicts the DESIGN.md mandate of strict
grayscale by providing a full color picker. The component is dead UI surface.

### Current state
**`ThemeCustomizer.tsx`**: 126 lines, component exists but is not imported in
`Settings.tsx` (confirmed by grep — no import of `ThemeCustomizer`).

### Scope
**In scope**: `src/components/ThemeCustomizer.tsx` (delete the file)
**Out of scope**: Other theme-related code

### Steps

#### Step 1: Verify no imports
```bash
grep -r "ThemeCustomizer" src/
```
If the only reference is the file itself, safe to delete. If imported, remove the
import first.

#### Step 2: Delete the file
```bash
rm src/components/ThemeCustomizer.tsx
```

#### Step 3: Verify
```bash
npm run typecheck
```
Expected: exit 0.

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] No references to `ThemeCustomizer` remain
- [ ] File deleted from disk

---

## Plan 21: Persist focus session notes to SQLite

### Why this matters
`FocusSessionNotes` saves notes to `localStorage` under `"focus_notes"`. After
saving, notes are invisible — there is no review interface or export path. The
note for the current session overwrites the previous one. LocalStorage is also
not included in data export or backup.

### Current state
**`FocusSessionNotes.tsx:23-25`**: `localStorage.setItem("focus_notes", ...)`

No database table for notes exists. No notes review UI.

### Scope (MVP)
**In scope**: `src-tauri/src/database.rs` (add `focus_notes` table + CRUD),
`src-tauri/src/lib.rs` (add Tauri commands), `src/services/api.ts` (add API methods),
`src/components/FocusSessionNotes.tsx` (use API instead of localStorage)

### Steps (MVP)

#### Step 1: Add focus_notes table to `database.rs`
```sql
CREATE TABLE IF NOT EXISTS focus_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_start_time INTEGER NOT NULL,
    session_end_time INTEGER,
    content TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

Add methods: `save_focus_note`, `get_focus_notes` (for review UI).

#### Step 2: Add Tauri commands in `lib.rs`
`save_focus_note(session_start_time, content)` and `get_focus_notes()`

#### Step 3: Add frontend API methods in `src/services/api.ts`

#### Step 4: Update `FocusSessionNotes.tsx` to use API instead of localStorage

#### Step 5: Add review UI (minimal: list notes in Settings or Focus page)

#### Step 6: Verify
```bash
cd src-tauri && cargo test
```
Expected: all pass.
```bash
npm run typecheck
```
Expected: exit 0.

### Done criteria
- [ ] Notes persist to SQLite
- [ ] Notes are visible in a review UI
- [ ] Notes survive localStorage clear

---

## Plan 22: Consolidate `settings_store.rs` test/prod duplication

### Why this matters
`settings_store.rs` uses `#[cfg(test)]` vs `#[cfg(not(test))]` to define separate
load/save functions for 3 settings types. That's 12 functions (6 pairs) where
the test versions are no-ops (return `Ok(())` or `Err(NotFound)`). Adding a new
settings type requires 4 function definitions.

### Current state
**`settings_store.rs`**: 6 `#[cfg(test)]` functions + 6 `#[cfg(not(test))]` counterparts.

### Scope
**In scope**: `src-tauri/src/settings_store.rs`, `src-tauri/src/*.rs` (callers)

### Approach
Replace compile-time gating with a trait/struct that can be mocked in tests.
Or simpler: use a single function that checks `cfg!(test)` at runtime and uses
a `HashMap` in test mode.

### Steps

#### Step 1: Create a unified `SettingsStore` trait or struct
```rust
pub struct SettingsStore {
    test_mode: bool,
    // In test mode, holds settings in memory
    #[cfg(test)]
    memory: std::sync::Mutex<std::collections::HashMap<String, String>>,
}
```

#### Step 2: Replace per-function `#[cfg]` gating with one `#[cfg(test)]` block
If the trait approach is too heavy, the simplest fix is:
```rust
fn save_json<T: Serialize>(file_name: &str, value: &T) -> io::Result<()> {
    if std::env::var("ZENITH_TEST").is_ok() || cfg!(test) {
        return Ok(());
    }
    // real impl...
}
```
But `cfg!(test)` is evaluated at compile time, not runtime, so this doesn't work
for `#[cfg(test)]` functions that need different *types* (filesystem vs nothing).

**Simplest fix**: Merge the two sets into one that handles both modes at runtime,
using a `OnceLock<bool>` or environment variable check.

#### Step 3: Verify
```bash
cd src-tauri && cargo test
```
Expected: all tests pass.
```bash
cd src-tauri && cargo clippy -- -D warnings
```
Expected: clean.

### Done criteria
- [ ] Function count reduced from 12 to ~6
- [ ] No `#[cfg(test)]` on individual load/save functions (one module-level block OK)

---

## Plan 23: Fix `PendingWrite::RecordSession` silent data loss

### Why this matters
When `record_usage` (atomic DB write) fails and the write is buffered as
`PendingWrite::RecordSession`, the retry handler at `tracker.rs:299-311`
cannot retry it because `record_usage_atomic` requires `&mut Database` but
the retry loop holds `&Database` through the lock guard. The data is silently
dropped.

### Current state
**`tracker.rs:299-311`**:
```rust
PendingWrite::RecordSession { app_name, duration_seconds } => {
    tracing::warn!("Cannot retry atomic record (requires mut db), dropping");
}
```

### Scope
**In scope**: `src-tauri/src/tracker.rs`
**Out of scope**: `database.rs`

### Steps

#### Step 1: Restructure the retry to hold a mutable DB reference
The retry loop at `tracker.rs:279` currently does:
```rust
let db = self.db.lock().await;
```
To get `&mut Database`, change this section to drop and re-acquire the lock
per-write, or split the loop into two phases:
1. First retry all `UpdateSession` writes (need `&Database`)
2. Then for `RecordSession` writes, drop the lock, re-acquire with `&mut`:
```rust
for write in record_session_writes {
    let mut db = self.db.lock().await;
    if let Err(e) = db.record_usage_atomic(&write.app_name, write.duration_seconds) {
        // re-buffer
    }
}
```

#### Step 2: Separate the retry loop into two passes
Process `UpdateSession` writes first (with shared ref), then drop the lock and
process `RecordSession` writes with `&mut`.

#### Step 3: Verify
```bash
cd src-tauri && cargo test
```
Expected: all pass.

### Done criteria
- [ ] `PendingWrite::RecordSession` entries are actually retried
- [ ] No data loss on transient write failures

---

## Plan 24: Remove `#[allow(dead_code)]` on unused error variants

### Why this matters
5 variants in `WellbeingError` plus the `Result<T>` alias are marked
`#[allow(dead_code)]`. These suppress valid compiler warnings and represent
maintenance surface for code that is never used.

### Current state
**`error.rs:17,21,25,29,46`**: `AppNotFound`, `LimitNotFound`, `Config`,
`WindowTracker`, `pub type Result<T>` — all `#[allow(dead_code)]`.

### Scope
**In scope**: `src-tauri/src/error.rs`

### Steps

#### Step 1: Remove unused variants
Delete these variants from `WellbeingError`:
- `AppNotFound(String)` — never constructed
- `LimitNotFound(String)` — never constructed
- `Config(String)` — never constructed
- `WindowTracker(String)` — never constructed

#### Step 2: Remove the `Result<T>` type alias
Delete `pub type Result<T> = std::result::Result<T, WellbeingError>;` — only
`CmdResult<T>` is used throughout the codebase.

#### Step 3: Remove all `#[allow(dead_code)]` annotations
Remove the `#[allow(dead_code)]` lines above the removed items.

#### Step 4: Verify
```bash
cd src-tauri && cargo test
```
Expected: all tests pass.
```bash
cd src-tauri && cargo clippy -- -D warnings
```
Expected: clean.

### Done criteria
- [ ] `cd src-tauri && cargo test` exits 0
- [ ] `cd src-tauri && cargo clippy -- -D warnings` exits 0
- [ ] No `#[allow(dead_code)]` remains in `error.rs`
- [ ] Unused variants removed

---

## Plan 25: Add DESIGN.md fonts to `package.json`

### Why this matters
The design system specifies Newsreader (serif for headlines), Inter (sans for
body text), and Geist Mono (mono for data/timers). None of these fonts are
imported anywhere. The app renders in system default fonts, contradicting the
design intent.

### Current state
`DESIGN.md:14-18` specifies fonts. `package.json` has no `@fontsource/newsreader`,
`@fontsource/inter`, or `@fontsource/geist-mono` entries.

### Scope
**In scope**: `package.json` (add font deps), `src/main.tsx` or `src/index.css`
(import fonts)

### Steps

#### Step 1: Add font packages
```bash
npm install @fontsource/newsreader @fontsource/inter @fontsource/geist-mono
```

#### Step 2: Import fonts in `src/main.tsx`
```ts
import "@fontsource/newsreader";
import "@fontsource/inter";
import "@fontsource/geist-mono";
```

#### Step 3: Update `src/index.css` to use the fonts
```css
:root {
  --font-serif: 'Newsreader', serif;
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'Geist Mono', monospace;
}
```
Apply them to the Tailwind config or CSS variables as appropriate.

#### Step 4: Remove the remote `@font-face` for Geist Mono
If `src/index.css` has a `@font-face` loading Geist Mono from CDN (like
`cdn.jsdelivr.net`), remove it — the npm package handles it locally.

#### Step 5: Verify
```bash
npm run typecheck
```
Expected: exit 0.
```bash
npm run dev
```
Expected: app starts and shows the new fonts.

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] Three font packages in `package.json`
- [ ] Fonts imported in `main.tsx`
- [ ] Remote `@font-face` for Geist Mono removed

---

## Plan 26: Consolidate icon libraries

### Why this matters
The app uses both `lucide-react` (SVG icons, tree-shakeable) and
`@fontsource/material-symbols-outlined` (icon font, ~50KB). Using two icon
libraries means inconsistent rendering (font vs SVG), unnecessary bundle
weight, and two sets of import paths.

### Current state
- `lucide-react` in `package.json:57` — used in `DataImport.tsx`, some other files
- `@fontsource/material-symbols-outlined` in `package.json:38` — used in
  `Sidebar.tsx`, `OnboardingWizard.tsx`, `Settings.tsx`, etc.

### Scope
**In scope**: `package.json`, `src/components/layout/Sidebar.tsx`,
`src/components/OnboardingWizard.tsx`, `src/pages/Settings.tsx`, and other
files using `material-symbols-outlined` class names

### Steps

#### Step 1: Choose the winner — `lucide-react`
`lucide-react` is preferred: tree-shakeable, SVG (no layout shift from font load),
consistent with React component patterns, actively maintained.

#### Step 2: Find all `material-symbols-outlined` usages
```bash
grep -r "material-symbols" src/
```

#### Step 3: Replace each with the equivalent `lucide-react` icon
For each usage:
- Import the specific icon: `import { IconName } from "lucide-react"`
- Replace `<span class="material-symbols-outlined">icon_name</span>` with
  `<IconName className="w-5 h-5" />`

#### Step 4: Remove the font package
```bash
npm uninstall @fontsource/material-symbols-outlined
```

#### Step 5: Verify
```bash
npm run typecheck
```
Expected: exit 0.
```bash
npm run dev
```
Expected: app renders with SVG icons.

### Done criteria
- [ ] `npm run typecheck` exits 0
- [ ] No `material-symbols-outlined` class references remain
- [ ] `@fontsource/material-symbols-outlined` removed from `package.json`
- [ ] All icons render correctly

---

## Plan 27: Create `CLAUDE.md` for AI tooling

### Why this matters
The repo has `.opencode/` configuration for OpenCode but no `CLAUDE.md` or
`AGENTS.md` for AI tools like Claude Code. A project brief helps AI agents
understand architecture, conventions, and available commands.

### Current state
No `CLAUDE.md` or `AGENTS.md` in the repo root.

### Scope
**In scope**: `CLAUDE.md` (create)

### Steps

#### Step 1: Create `CLAUDE.md`
Write a brief with:
- Project name and purpose
- Tech stack (React 19, TypeScript, Tailwind v4, Tauri 2, Rust, SQLite)
- Architecture overview (Tauri commands, Zustand + TanStack Query)
- Key conventions (import paths, error handling, testing)
- Build/test commands (`npm run dev`, `npm run test`, `npm run typecheck`, etc.)
- Design reference (`DESIGN.md` — link to it)

### Done criteria
- [ ] `CLAUDE.md` exists at repo root

---

## STOP conditions (for any plan)

Stop and report back if:
1. The code at the specified locations doesn't match the excerpts (codebase drifted).
2. A step's verification fails twice after a reasonable fix attempt.
3. The fix requires touching a file outside the in-scope list.
4. A key assumption (e.g., file lines, function signatures) is wrong.

---

## Maintenance notes

- Plans 1 and 2 should be executed before any plan that adds TS tests or modifies
  the query hooks, to avoid testing friction or crash risks.
- Plan 4 (sanitize `extract_app_name`) fixes a correctness issue that compounds
  with Plan 18 (defense-in-depth). Do both.
- The `CASE WHEN` duplication (Plan 8 improves `get_weekly_stats`, but the 8-copy
  problem remains) is intentionally not addressed as a SQL function extraction —
  the duplication is annoying but each query has slightly different JOIN/WHERE
  clauses, making extraction nontrivial. If this becomes a maintenance burden,
  consider a comprehensive refactor.
- Plans 25 and 26 (fonts, icons) affect the DESIGN.md conformance. Plan 20
  (remove ThemeCustomizer) also relates to design conformance.
