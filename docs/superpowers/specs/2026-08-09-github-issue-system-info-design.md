# GitHub Issue Pre-filling with System Info Design

## Overview
When a user clicks "Report an Issue" in Zenith Settings, they can enter a title and description. Upon clicking "Open in Browser", Zenith will open a pre-filled GitHub issue page matching `.github/ISSUE_TEMPLATE/bug_report.yml`. Zenith automatically detects and pre-fills system information (OS, Desktop Environment, and App Version) alongside the title and description.

## Requirements
1. **Title & Description Input**: User enters issue title and description in `ReportIssueDialog`.
2. **Automated System Detection**:
   - OS name (e.g., `Arch Linux`, `Ubuntu 24.04 LTS`, `Windows 11`, `macOS`).
   - Desktop Environment & Session Type (e.g., `Hyprland (wayland)`, `GNOME (x11)`, `Windows Desktop`).
   - App Version (e.g., `0.2.0`).
3. **GitHub Issue Form Mapping**:
   - `template`: `bug_report.yml`
   - `title`: User provided title
   - `version`: `systemInfo.app_version`
   - `os`: `${systemInfo.os} / ${systemInfo.desktop_environment}`
   - `description`: User provided description
4. **UI Preview**: Display detected system info inside `ReportIssueDialog` so the user knows what metadata is attached.

## System Architecture

### 1. Rust Backend (`src-tauri/src/lib.rs` & `commands.rs`)
- Add `SystemInfo` struct:
  ```rust
  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct SystemInfo {
      pub os: String,
      pub desktop_environment: String,
      pub app_version: String,
  }
  ```
- Implement `get_system_info(app_handle: tauri::AppHandle) -> CmdResult<SystemInfo>` command:
  - Parses `/etc/os-release` on Linux for `PRETTY_NAME`.
  - Inspects `XDG_CURRENT_DESKTOP`, `DESKTOP_SESSION`, and `XDG_SESSION_TYPE` environment variables for Desktop Environment and session mode.
  - Gets app version from `app_handle.package_info().version`.
  - Platform-specific fallbacks for Windows and macOS.

### 2. Frontend API & Types (`src/types/index.ts` & `src/services/api.ts`)
- Add `SystemInfo` interface to `src/types/index.ts`.
- Expose `getSystemInfo` function on `api` in `src/services/api.ts`.

### 3. Component Updates (`src/pages/Settings.tsx`)
- Call `api.getSystemInfo()` when `ReportIssueDialog` opens.
- Render system info preview badge in the dialog.
- Update `handleSubmit` to construct URL with `template`, `title`, `version`, `os`, and `description` search params.

## Verification Plan
1. **Automated Tests**:
   - Run `cd src-tauri && cargo test` to verify Rust build and unit tests.
   - Run `npm run typecheck` and `npm run test:run` for frontend typechecking and tests.
2. **Manual Verification**:
   - Open Settings → Report an Issue.
   - Verify detected OS, Desktop Environment, and Version in dialog preview.
   - Fill Title and Description, click "Open in Browser".
   - Confirm browser opens GitHub issue page with all form fields pre-populated.
