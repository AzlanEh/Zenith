# Plan Set 2 — Correctness & Performance

> **Planned at**: commit `30ac6b0`, 2026-07-16  
> **Status**: Plans only — no code changes yet. Each plan is self-contained and
> can be executed independently (no dependency order between them).

---

## Execution order & status

| # | Title | Priority | Effort | Depends on | Status |
|---|-------|----------|--------|------------|--------|
| 1 | Fix `logger.error()` production no-op | P1 | S | — | TODO |
| 2 | Fix virtualizer scroll target + remove dead dep | P1 | S | — | TODO |
| 3 | Cache `is_app_blocked` check per tracking tick | P2 | S | — | TODO |
| 4 | Guard focus session recording from duplicate calls | P2 | S | — | TODO |
| 5 | Delete dead `Header.tsx` component | P3 | S | — | TODO |
| 6 | Fix `as` casts in mutation query hooks | P2 | S | — | TODO |
| 7 | Tighten broad `contains` patterns in `window_tracker` | P3 | S | — | TODO |

---

## Plan 1: Fix `logger.error()` production no-op

### Why this matters

`logger.error()` wraps every call in `if (DEV)`, making it a silent no-op in
production builds. The CLAUDE.md convention mandates `logger.error()` over
`console.error()`, but 30+ `logger.error()` calls (in FocusMode, Limits,
Settings, ErrorBoundary, etc.) produce zero output in production. Users
experiencing errors get no diagnostic feedback, and developers have no way
to investigate field issues without asking users to run dev builds.

### Current state

**`src/utils/logger.ts:1-7`**:
```ts
const DEV = import.meta.env.DEV;

export const logger = {
  error: (...args: unknown[]) => { if (DEV) console.error("[ERROR]", ...args); },
  warn: (...args: unknown[]) => { if (DEV) console.warn("[WARN]", ...args); },
  info: (...args: unknown[]) => { if (DEV) console.info("[INFO]", ...args); },
};
```

Every `logger.error(...)` call in the codebase is silently swallowed in production.

### Scope

**In scope**: `src/utils/logger.ts`
**Out of scope**: Any other files, any other console methods

### Commands

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm run test:run` | exit 0, 19 tests pass |
| Lint | `npm run lint` | exit 0 |

### Steps

#### Step 1: Remove the DEV gate from `logger.error`

Change `src/utils/logger.ts` from:
```ts
error: (...args: unknown[]) => { if (DEV) console.error("[ERROR]", ...args); },
```
to:
```ts
error: (...args: unknown[]) => { console.error("[ERROR]", ...args); },
```

Leave `warn` and `info` behind `DEV` — they are for development debugging,
not production diagnostics. Only `error` needs to be unconditional.

**Verify**:
```bash
npm run typecheck && npm run lint
```
Expected: both exit 0.

#### Step 2: Confirm no test regression

```bash
npm run test:run
```
Expected: 2 test files pass (19 tests).

### Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test:run` exits 0
- [ ] `logger.error(...)` is no longer gated behind `if (DEV)` in `src/utils/logger.ts`
- [ ] Only `src/utils/logger.ts` is modified

---

## Plan 2: Fix virtualizer scroll target + remove dead `@tanstack/react-virtual`

### Why this matters

The "Add Application" dialog in the Limits page uses `@tanstack/react-virtual`
to virtualize the app list, but the virtualizer is pointed at the wrong scroll
container. Users scrolling the dialog see empty space beyond the first ~6 items
instead of the full app list. Additionally, the 17KB dependency is entirely
wasted because the virtualizer never works.

### Current state

**`src/pages/Limits.tsx:101-107`**:
```ts
const pickerListRef = useRef<HTMLDivElement>(null);
const pickerVirtualizer = useVirtualizer({
  count: appsForCategory.length,
  getScrollElement: () => pickerListRef.current,
  estimateSize: () => 64,
  overscan: 5,
});
```

The ref is attached to the inner absolute-positioned div at line 184:
```tsx
<div ref={pickerListRef} className="absolute top-0 left-0 right-0" ...>
```

But the actual scroll container is the `overflow-y-auto` parent at line 164:
```tsx
<div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background">
```

The inner element has no `overflow` property, so the virtualizer reads
`scrollTop = 0` permanently and never recycles DOM nodes.

Only one file imports this package:
```
$ grep -rn "@tanstack/react-virtual" src/
src/pages/Limits.tsx:1:import { useVirtualizer } from "@tanstack/react-virtual";
```

### Scope

**In scope**: `src/pages/Limits.tsx`, `package.json`
**Out of scope**: Any other file

Approach: Replace the virtualizer with a simple `.map()` render. The app list
is typically small (10-50 installed apps), so virtualization provides no
benefit here — a plain scrollable list is simpler and eliminates the dependency.

### Commands

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm run test:run` | exit 0 |
| Lint | `npm run lint` | exit 0 |

### Steps

#### Step 1: Replace the virtualizer with a plain scrollable list

In `src/pages/Limits.tsx`, make these changes:

1. Remove the `import { useVirtualizer } from "@tanstack/react-virtual"` line
2. Remove the `pickerListRef` definition (line 101)
3. Remove the `pickerVirtualizer` definition (lines 102-107)
4. Remove the `appsForCategory.length === 0` check (lines 190-253) — it becomes redundant since we'll map directly
5. Replace the virtualizer render block with a simple `.map()`:

```tsx
{pickerListRef/* previously ref'd div */} ... remove the ref
```

Actually, the simplest correct replacement: remove the `relative` wrapper div
and its inner absolute div entirely, and just map directly inside the
`overflow-y-auto` container. The scroll container at line 164 already handles
overflow. Replace lines 182-255:

```tsx
<div className="space-y-2">
  {appsForCategory.length === 0 ? (
    <div className="text-center py-12 text-muted-foreground text-sm font-mono uppercase tracking-widest">
      No applications found
    </div>
  ) : (
    appsForCategory.map((app) => {
      const isSelected = selectedApps.includes(app.name);
      return (
        <div
          key={app.name}
          onClick={() => {
            setSelectedApps((prev) =>
              prev.includes(app.name)
                ? prev.filter((n) => n !== app.name)
                : [...prev, app.name],
            );
          }}
          className={`flex items-center justify-between p-4 transition-colors group cursor-pointer ${
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/10 hover:bg-secondary/30 text-foreground"
          }`}
        >
          ...rest of the existing item content...
        </div>
      );
    })
  )}
</div>
```

Key points to preserve from the existing code:
- The `style={{ position: "absolute", top: 0, ... }}` lines must be removed
  (those were virtualizer-specific positioning)
- The `transform: translateY(...)` must be removed
- The checkbox/tick icon, AppIcon rendering, and selection state must stay
- All Tailwind classes on the items themselves remain unchanged

Be careful: the `appsForCategory.length === 0` check should remain from the
original code but now render as a simple empty state.

**Verify**:
```bash
npm run typecheck
```
Expected: exit 0.

#### Step 2: Remove `@tanstack/react-virtual` from `package.json`

```bash
npm uninstall @tanstack/react-virtual
```

**Verify**:
```bash
npm run typecheck && npm run lint
```
Expected: both exit 0.

#### Step 3: Run full test suite

```bash
npm run test:run
```
Expected: 19 tests pass.

### Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test:run` exits 0
- [ ] No import of `@tanstack/react-virtual` remains in `src/`
- [ ] `@tanstack/react-virtual` removed from `package.json` dependencies
- [ ] Dialog app list renders all items via native scroll (no virtualizer)
- [ ] Only `src/pages/Limits.tsx` and `package.json` are modified

---

## Plan 3: Cache `is_app_blocked` check in tracking loop

### Why this matters

Every 1-second tracking tick, `track_window()` calls `db.is_app_blocked(app)`,
which runs 2 SQL queries: a fast-path existence check and, if blocking is
enabled, a full JOIN+SUM aggregation on today's usage. The blocked status
only changes on infrequent events (user exceeds a limit — minutes-to-hours
granularity — or modifies limits). Re-checking every second causes excess
DB lock contention and wastes CPU on the aggregation query.

### Current state

**`src-tauri/src/tracker.rs:389-392`** — called every tick (1-second interval):
```rust
let db = self.db.lock().await;
let is_blocked = db.is_app_blocked(app).unwrap_or(false);
drop(db);
```

**`src-tauri/src/database.rs:589-635`** — `is_app_blocked` runs 2 queries:
```rust
pub fn is_app_blocked(&self, app_name: &str) -> SqliteResult<bool> {
    // Query 1: fast path — check if app has blocking enabled
    let has_blocking_limit: bool = ...
    // Query 2: slow path — aggregate today's usage vs limit
    let result: Option<(i32, i64)> = ...
}
```

### Scope

**In scope**: `src-tauri/src/tracker.rs`
**Out of scope**: `database.rs`, `lib.rs`, any other file

### Approach

Add a time-based cache: skip the `is_app_blocked` check for apps that were
checked within the last N seconds. The existing `limit_check_counter` already
runs `check_limits_and_notify` every 10 seconds — align the blocked-app
cache with the same cadence. Store the last-check timestamp per app in a
small HashMap.

### Commands

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Rust tests | `cd src-tauri && cargo test` | exit 0, 55+ tests pass |
| Clippy | `cd src-tauri && cargo clippy -- -D warnings` | exit 0, no warnings |

### Steps

#### Step 1: Add a cached-blocked-check HashMap and last-check timestamp to `UsageTracker`

In `tracker.rs`, add two new fields to the `UsageTracker` struct (around line 68,
near the other tracking-state fields):

```rust
/// Cache for is_app_blocked results to avoid DB queries every tick.
/// Key: app_name, Value: (is_blocked, checked_at_seconds)
cached_blocked: Arc<Mutex<HashMap<String, (bool, i64)>>>,
```

Initialize in `UsageTracker::new()` (around line 90):
```rust
cached_blocked: Arc::new(Mutex::new(HashMap::new())),
```

The `BLOCKED_CHECK_CACHE_SECONDS` constant should be 10 (matching the existing
`limit_check_counter` cycle — defined near the other constants around line 14):

```rust
/// How often (in seconds) to re-check if an app is blocked
const BLOCKED_CHECK_CACHE_SECONDS: i64 = 10;
```

#### Step 2: Replace the direct `is_app_blocked` call with a cached check

Replace lines 389-392:
```rust
let db = self.db.lock().await;
let is_blocked = db.is_app_blocked(app).unwrap_or(false);
drop(db);
```

with:
```rust
let now = chrono::Utc::now().timestamp();
let is_blocked = {
    let mut cache = self.cached_blocked.lock().await;
    if let Some(&(blocked, checked_at)) = cache.get(app) {
        if now - checked_at < BLOCKED_CHECK_CACHE_SECONDS {
            blocked
        } else {
            // Cache expired, re-check
            let db = self.db.lock().await;
            let result = db.is_app_blocked(app).unwrap_or(false);
            drop(db);
            cache.insert(app.to_string(), (result, now));
            result
        }
    } else {
        // Not in cache, check and populate
        let db = self.db.lock().await;
        let result = db.is_app_blocked(app).unwrap_or(false);
        drop(db);
        cache.insert(app.to_string(), (result, now));
        result
    }
};
```

#### Step 3: Add cache clearing to `reset_state`

In `reset_state()` (line 96-104), add:
```rust
self.cached_blocked.lock().await.clear();
```

#### Step 4: Verify

```bash
cd src-tauri && cargo test && cargo clippy -- -D warnings
```
Expected: all tests pass, no warnings.

### Done criteria

- [ ] `cd src-tauri && cargo test` exits 0
- [ ] `cd src-tauri && cargo clippy -- -D warnings` exits 0
- [ ] `cached_blocked` field exists on `UsageTracker` and is initialized
- [ ] `is_app_blocked` is called at most once per 10 seconds per app
- [ ] Cache is cleared on `reset_state()`

---

## Plan 4: Guard focus session recording from duplicate calls

### Why this matters

`FocusMode.tsx` has a `useEffect` that calls `addSession()` when `state === "completed"`.
The effect depends on `[state, totalTime, addSession]`. If the component
re-renders while `state` is still `"completed"` (from a tab switch, React
re-render, or layout change), the effect re-fires and adds a duplicate session
record to localStorage. Over time this inflates the session log and corrupts
focus-history metrics.

### Current state

**`src/pages/FocusMode.tsx:62-76`**:
```tsx
useEffect(() => {
  if (isSettingsOpen && settings) {
    setLocalFocusMin(settings.default_duration_minutes);
  }
  if (state === "completed") {
    addSession({
      date: new Date().toISOString().split("T")[0],
      duration_minutes: Math.floor(totalTime / 60),
      completed: true,
      scheduled: false,
    });
    setNotesOpen(true);
  }
}, [state, totalTime, addSession]);
```

No deduplication: if the effect runs again while state is still `"completed"`,
it adds another session. Also — the first condition (`isSettingsOpen && settings`)
is unrelated to the second and should be a separate effect.

### Scope

**In scope**: `src/pages/FocusMode.tsx`
**Out of scope**: Store, hooks, other pages

### Approach

Split the effect into two: one for settings init (which only needs
`[isSettingsOpen, settings]`), and one for session completion with a
`useRef` guard that prevents duplicate `addSession` calls.

### Commands

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Tests | `npm run test:run` | exit 0 |

### Steps

#### Step 1: Replace the combined effect with two focused effects

Remove the single `useEffect` at lines 62-76 and replace with:

```tsx
const hasReportedCompletion = useRef(false);

// Initialize local settings when settings dialog opens
useEffect(() => {
  if (isSettingsOpen && settings) {
    setLocalFocusMin(settings.default_duration_minutes);
  }
}, [isSettingsOpen, settings]);

// Record session on completion (with dedup guard)
useEffect(() => {
  if (state === "completed" && !hasReportedCompletion.current) {
    hasReportedCompletion.current = true;
    addSession({
      date: new Date().toISOString().split("T")[0],
      duration_minutes: Math.floor(totalTime / 60),
      completed: true,
      scheduled: false,
    });
    setNotesOpen(true);
  }
  // Reset guard when leaving completed state
  if (state !== "completed") {
    hasReportedCompletion.current = false;
  }
}, [state, totalTime, addSession]);
```

Add the `useRef` import to the React import at the top of the file (it should
already be imported from line 12 — confirm that `useRef` is in the import).

**Verify**:
```bash
npm run typecheck
```
Expected: exit 0.

#### Step 2: Run full verification

```bash
npm run lint && npm run test:run
```
Expected: both exit 0.

### Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test:run` exits 0
- [ ] Duplicate session recording is prevented by `hasReportedCompletion` guard
- [ ] Settings init effect and session completion effect are separate

---

## Plan 5: Delete dead `Header.tsx` component

### Why this matters

`src/components/layout/Header.tsx` exports a `memo(function Header(…))`
component that is never imported anywhere in the codebase. It contains a
hardcoded default title `"Good morning, Azlan"` — a hardcoded user name in
production code, which is a bug if it were actually visible, but it's dead
code regardless. Deleting it removes maintenance surface and an embarrassing
production-code artifact.

### Current state

**`src/components/layout/Header.tsx`** (42 lines) — exported, memoized,
defined with `toggleSidebar`, `sidebarOpen`, `title`, `subtitle`, `children`
props. Zero imports across the codebase.

Confirmed:
```
$ grep -rn "from.*layout/Header\|import.*Header" src/ --include="*.tsx" --include="*.ts"
(no output — only self-references)
```

### Scope

**In scope**: `src/components/layout/Header.tsx`
**Out of scope**: Any other file

### Commands

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Verify no imports | `grep -rn "layout/Header" src/` | only the file itself |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Tests | `npm run test:run` | exit 0 |

### Steps

#### Step 1: Delete the file

```bash
rm src/components/layout/Header.tsx
```

#### Step 2: Verify

```bash
npm run typecheck && npm run lint && npm run test:run
```

Expected: all exit 0.

### Done criteria

- [ ] `src/components/layout/Header.tsx` no longer exists on disk
- [ ] `npm run typecheck` exits 0 (no broken imports)
- [ ] `npm run lint` exits 0
- [ ] `npm run test:run` exits 0
- [ ] No references to `Header` from `layout/Header` remain in `src/`

---

## Plan 6: Fix `as` casts in mutation query hooks

### Why this matters

Both `useUpdateFocusSettings` and `useUpdateNotificationSettings` use a
non-null assertion `!` / `?? {}` fallback with an `as` cast to merge cached
data with partial updates. If the query cache is cleared (e.g., on cache
invalidation between `getQueryData` and the mutation call), the `?? {}`
fallback creates an empty object with missing required fields. The `as` cast
silences the type checker, so the incomplete object is sent to the Rust
backend, which either deserializes with missing fields (producing incorrect
state) or returns an error.

### Current state

**`src/queries/useFocusSettings.ts:15-16`**:
```ts
mutationFn: (updates: Partial<FocusSettings>) =>
  api.setFocusSettings({ ...queryClient.getQueryData<FocusSettings>(["focusSettings"]) ?? {}, ...updates } as FocusSettings),
```

**`src/queries/useNotificationSettings.ts:15-16`**: identical pattern.

### Scope

**In scope**: `src/queries/useFocusSettings.ts`, `src/queries/useNotificationSettings.ts`
**Out of scope**: Any other query files

### Commands

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Tests | `npm run test:run` | exit 0 |

### Steps

#### Step 1: Fix `useFocusSettings.ts`

Replace:
```ts
mutationFn: (updates: Partial<FocusSettings>) =>
  api.setFocusSettings({ ...queryClient.getQueryData<FocusSettings>(["focusSettings"]) ?? {}, ...updates } as FocusSettings),
```
with:
```ts
mutationFn: (updates: Partial<FocusSettings>) => {
  const current = queryClient.getQueryData<FocusSettings>(["focusSettings"]);
  if (!current) return Promise.reject(new Error("Focus settings not loaded yet"));
  return api.setFocusSettings({ ...current, ...updates });
},
```

#### Step 2: Fix `useNotificationSettings.ts`

Same pattern:
```ts
mutationFn: (updates: Partial<NotificationSettings>) => {
  const current = queryClient.getQueryData<NotificationSettings>(["notificationSettings"]);
  if (!current) return Promise.reject(new Error("Notification settings not loaded yet"));
  return api.setNotificationSettings({ ...current, ...updates });
},
```

#### Step 3: Verify

```bash
npm run typecheck && npm run lint && npm run test:run
```
Expected: all exit 0.

### Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test:run` exits 0
- [ ] No `as` cast on the spread result in `src/queries/useFocusSettings.ts`
- [ ] No `as` cast on the spread result in `src/queries/useNotificationSettings.ts`
- [ ] Cache-miss case returns a rejected promise instead of sending partial data

---

## Plan 7: Tighten broad `contains` patterns in `window_tracker`

### Why this matters

Two `AppMapping` entries in `window_tracker.rs` use overly broad `contains`
patterns that match unrelated apps:

- `contains: Some("zen")` — matches zenity, zenmap, zenscanner, any app with
  "zen" in its class name → categorized as "Zen Browser"
- `contains: Some("notepad")` — matches notepadqq, gedit-notepad, etc. →
  categorized as "NotepadPlusPlus"

While these edge cases are uncommon, incorrect attribution in tracking data
silently distorts usage statistics for the affected apps.

### Current state

**`src-tauri/src/window_tracker.rs:42-46`**:
```rust
AppMapping {
    exact: Some("zen-alpha"),
    contains: Some("zen"),
    display_name: "Zen Browser",
},
```

Line 75 area — similar for `notepad`.

### Scope

**In scope**: `src-tauri/src/window_tracker.rs`
**Out of scope**: `tracker.rs`, `database.rs`, any other file

### Steps

#### Step 1: Tighten the "zen" pattern

Replace:
```rust
contains: Some("zen"),
```
with:
```rust
contains: Some("zen-"),
```

Zen Browser's window class is `zen-alpha` which contains `"zen-"`. The `-`
distinguishes it from `zenity`, `zenmap`, etc.

#### Step 2: Tighten the "notepad" pattern

If the current mapping uses `contains: Some("notepad")`, narrow it to:
```rust
contains: Some("notepad++"),
```
or change to an exact match if the class is `notepad`:
```rust
exact: Some("notepad"),
```

Check the exact current state of the `notepad` mapping before making the change.
If `contains` is used, the safest replacement is `exact: Some("notepad")` since
the window class for the actual Notepad++ (when run via Wine or a native port)
may vary — use `contains: Some("notepad++")` if you want to keep substring matching.

#### Step 3: Verify

```bash
cd src-tauri && cargo test && cargo clippy -- -D warnings
```
Expected: all tests pass.

### Done criteria

- [ ] `cd src-tauri && cargo test` exits 0
- [ ] `cd src-tauri && cargo clippy -- -D warnings` exits 0
- [ ] "zen" pattern no longer matches standalone "zen" substring (uses "zen-" or stricter)
- [ ] "notepad" pattern narrowed appropriately

---

## STOP conditions (for any plan)

Stop and report back if:

1. The code at the specified locations doesn't match the excerpts (codebase drifted).
2. A step's verification fails twice after a reasonable fix attempt.
3. The fix requires touching a file outside the in-scope list.
4. A key assumption (e.g., line numbers, function signatures) is wrong.
