# GitHub Issue Pre-filling with System Info Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically detect and pre-fill system info (OS, Desktop Environment, and App Version) along with user-entered title and description when opening a GitHub issue from Zenith Settings.

**Architecture:** A Rust Tauri command (`get_system_info`) reads OS distribution from `/etc/os-release`, Desktop Environment + session type from environment variables, and app version from package metadata. The frontend calls this command when `ReportIssueDialog` opens, displays a system info preview badge, and constructs a pre-filled GitHub issue URL matching `.github/ISSUE_TEMPLATE/bug_report.yml` parameter fields (`title`, `version`, `os`, `description`).

**Tech Stack:** Rust (Tauri v2), React 19, TypeScript, Lucide React, Tailwind CSS.

## Global Constraints
- React 19 / TypeScript strict mode.
- Tailwind CSS v4 styling (`oklch` color tokens, zero border radius).
- Rust tests with `cargo test`.
- ESLint and `tsc --noEmit` check.

---

### Task 1: SystemInfo Rust Backend Command

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `get_system_info` Tauri command returning `SystemInfo`:
  ```rust
  #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
  pub struct SystemInfo {
      pub os: String,
      pub desktop_environment: String,
      pub app_version: String,
  }
  ```

- [ ] **Step 1: Write unit test in Rust for `get_system_info`**

Add unit test to `src-tauri/src/lib.rs` under `mod tests`:
```rust
#[test]
fn test_system_info_fields_not_empty() {
    let os = get_os_name();
    let de = get_desktop_environment();
    assert!(!os.is_empty(), "OS name should not be empty");
    assert!(!de.is_empty(), "Desktop environment should not be empty");
}
```

- [ ] **Step 2: Run cargo test to verify failure**

Run: `cd src-tauri && cargo test test_system_info_fields_not_empty`
Expected: Failure (functions `get_os_name` / `get_desktop_environment` do not exist yet).

- [ ] **Step 3: Implement `SystemInfo` and `get_system_info` command**

In `src-tauri/src/lib.rs`:
```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub desktop_environment: String,
    pub app_version: String,
}

fn get_os_name() -> String {
    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
            for line in content.lines() {
                if let Some(name) = line.strip_prefix("PRETTY_NAME=") {
                    return name.trim_matches('"').to_string();
                }
            }
        }
        "Linux".to_string()
    }
    #[cfg(target_os = "windows")]
    {
        "Windows".to_string()
    }
    #[cfg(target_os = "macos")]
    {
        "macOS".to_string()
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        std::env::consts::OS.to_string()
    }
}

fn get_desktop_environment() -> String {
    #[cfg(target_os = "linux")]
    {
        let desktop = std::env::var("XDG_CURRENT_DESKTOP")
            .or_else(|_| std::env::var("DESKTOP_SESSION"))
            .unwrap_or_else(|_| "Unknown".to_string());
        let session_type = std::env::var("XDG_SESSION_TYPE").unwrap_or_default();
        if !session_type.is_empty() {
            format!("{} ({})", desktop, session_type)
        } else {
            desktop
        }
    }
    #[cfg(target_os = "windows")]
    {
        "Windows Desktop".to_string()
    }
    #[cfg(target_os = "macos")]
    {
        "Aqua".to_string()
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        "Unknown".to_string()
    }
}

#[tauri::command]
fn get_system_info(app_handle: tauri::AppHandle) -> CmdResult<SystemInfo> {
    let app_version = app_handle.package_info().version.to_string();
    Ok(SystemInfo {
        os: get_os_name(),
        desktop_environment: get_desktop_environment(),
        app_version,
    })
}
```
Register `get_system_info` in `tauri::generate_handler![..., get_system_info]`.

- [ ] **Step 4: Run cargo test to verify pass**

Run: `cd src-tauri && cargo test test_system_info_fields_not_empty`
Expected: PASS.

- [ ] **Step 5: Commit Rust changes**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(tauri): add get_system_info command for OS, DE, and version"
```

---

### Task 2: Frontend API Types & API Invocation Wrapper

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/services/api.ts`

**Interfaces:**
- Consumes: `get_system_info` Rust Tauri command.
- Produces: `SystemInfo` TS interface & `api.getSystemInfo()`.

- [ ] **Step 1: Add `SystemInfo` type definition to `src/types/index.ts`**

```ts
export interface SystemInfo {
  os: string;
  desktop_environment: string;
  app_version: string;
}
```

- [ ] **Step 2: Add `getSystemInfo` function to `src/services/api.ts`**

Import `SystemInfo` in `src/services/api.ts` and add:
```ts
getSystemInfo: (): Promise<SystemInfo> => invokeApi("get_system_info"),
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit frontend API changes**

```bash
git add src/types/index.ts src/services/api.ts
git commit -m "feat(api): add SystemInfo type and getSystemInfo API wrapper"
```

---

### Task 3: UI System Info Preview & GitHub Issue Form Pre-filling

**Files:**
- Modify: `src/pages/Settings.tsx`

**Interfaces:**
- Consumes: `api.getSystemInfo()`, `openUrl` from `@tauri-apps/plugin-opener`.

- [ ] **Step 1: Update `ReportIssueDialog` state and useEffect**

In `ReportIssueDialog` (`src/pages/Settings.tsx`):
```tsx
const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

useEffect(() => {
  if (!open) return;
  api
    .getSystemInfo()
    .then(setSystemInfo)
    .catch((err) => {
      logger.error("Failed to fetch system info:", err);
    });
}, [open]);
```

- [ ] **Step 2: Add System Info preview badge to dialog content**

In `ReportIssueDialog`:
Display detected system info below the description field:
```tsx
{systemInfo && (
  <div className="border border-border bg-muted/30 p-3 font-mono text-xs flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
    <div><span className="text-foreground font-semibold">OS:</span> {systemInfo.os}</div>
    <div><span className="text-foreground font-semibold">DE:</span> {systemInfo.desktop_environment}</div>
    <div><span className="text-foreground font-semibold">Version:</span> v{systemInfo.app_version}</div>
  </div>
)}
```

- [ ] **Step 3: Update `handleSubmit` to pre-fill GitHub issue URL parameters**

```tsx
const handleSubmit = () => {
  if (!title.trim() || !body.trim()) return;
  const url = new URL(REPORT_ISSUE_URL);
  url.searchParams.set("title", title.trim());
  if (systemInfo) {
    url.searchParams.set("version", systemInfo.app_version);
    url.searchParams.set("os", `${systemInfo.os} / ${systemInfo.desktop_environment}`);
  }
  url.searchParams.set("description", body.trim());
  openUrl(url.toString());
  setTitle("");
  setBody("");
  setOpen(false);
};
```

- [ ] **Step 4: Run typecheck, lint, and tests**

Run: `npm run typecheck && npm run lint && npm run test:run`
Expected: PASS with zero errors.

- [ ] **Step 5: Commit UI changes**

```bash
git add src/pages/Settings.tsx
git commit -m "feat(settings): pre-fill GitHub issue form fields with system info"
```
