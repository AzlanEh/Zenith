mod app_scanner;
mod autostart;
mod break_reminder;
mod commands;
mod database;
mod error;
mod focus_mode;
mod goals;
mod limit_popup;
mod migrations;
mod notification_settings;
mod notifications;
mod popup_manager;
mod settings_store;
mod tracker;
mod tray;
mod window_tracker;

use app_scanner::InstalledApp;
use autostart::AutostartStatus;
use break_reminder::{BreakReminder, BreakSettings};
use commands::{DailyStats, DayStats, WeeklyStats};
use database::{AppLimit, AppUsage, CategoryUsage, Database, ExportRecord, HourlyUsage};
use error::WellbeingError;
use focus_mode::{FocusManager, FocusSession, FocusSettings};
use fs2::FileExt;
use goals::{Achievement, Goal, GoalProgress, GoalType, GoalsState};
use limit_popup::EmergencyAccessManager;
use notification_settings::{NotificationManager, NotificationSettings};
use popup_manager::PopupManager;
use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Arc;
use tauri::{Emitter, Manager, State};
use tauri_plugin_updater::UpdaterExt;
use tokio::sync::Mutex;
use tracker::UsageTracker;

type CmdResult<T> = Result<T, WellbeingError>;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub break_reminder: Arc<BreakReminder>,
    pub notification_manager: Arc<NotificationManager>,
    pub focus_manager: Arc<FocusManager>,
    pub goals_state: Arc<Mutex<GoalsState>>,
    pub emergency_access: Arc<EmergencyAccessManager>,
    pub popup_manager: Arc<PopupManager>,
    pub tracker: Arc<Mutex<UsageTracker>>,
    /// The background tracker instance, used for graceful shutdown
    pub background_tracker: Arc<Mutex<Option<Arc<UsageTracker>>>>,
}

#[tauri::command]
async fn get_daily_usage(state: State<'_, AppState>) -> CmdResult<DailyStats> {
    let db = state.db.lock().await;
    let apps = db.get_daily_usage()?;

    let total_seconds: i64 = apps.iter().map(|a| a.duration_seconds).sum();

    tracing::debug!(
        app_count = apps.len(),
        total_seconds,
        "get_daily_usage called by frontend"
    );

    Ok(DailyStats {
        total_seconds,
        apps,
    })
}

#[tauri::command]
async fn get_weekly_stats(state: State<'_, AppState>) -> CmdResult<WeeklyStats> {
    let db = state.db.lock().await;
    let raw_stats = db.get_weekly_stats()?;

    let days: Vec<commands::DayStats> = raw_stats
        .iter()
        .map(|(timestamp, seconds)| {
            let date = chrono::DateTime::from_timestamp(*timestamp, 0)
                .map(|dt| dt.format("%Y-%m-%d").to_string())
                .unwrap_or_else(|| "1970-01-01".to_string());

            commands::DayStats {
                date,
                timestamp: *timestamp,
                total_seconds: *seconds,
            }
        })
        .collect();

    let total_seconds: i64 = days.iter().map(|d| d.total_seconds).sum();

    Ok(WeeklyStats {
        days,
        total_seconds,
    })
}

#[tauri::command]
async fn set_app_limit(
    state: State<'_, AppState>,
    app_name: String,
    minutes: i32,
    block_when_exceeded: Option<bool>,
) -> CmdResult<()> {
    if !is_valid_app_name(&app_name) {
        return Err(WellbeingError::InvalidAppName(app_name));
    }
    if !(1..=1440).contains(&minutes) {
        return Err(WellbeingError::Other(
            "Daily limit must be between 1 and 1440 minutes".to_string(),
        ));
    }
    let db = state.db.lock().await;
    let block = block_when_exceeded.unwrap_or(false);
    db.set_limit_with_block(&app_name, minutes, block)?;
    Ok(())
}

#[tauri::command]
async fn get_app_limits(state: State<'_, AppState>) -> CmdResult<Vec<AppLimit>> {
    let db = state.db.lock().await;
    Ok(db.get_all_limits()?)
}

#[tauri::command]
async fn remove_app_limit(state: State<'_, AppState>, app_name: String) -> CmdResult<()> {
    if !is_valid_app_name(&app_name) {
        return Err(WellbeingError::InvalidAppName(app_name));
    }
    let db = state.db.lock().await;
    db.remove_limit(&app_name)?;
    Ok(())
}

#[tauri::command]
async fn get_all_apps(state: State<'_, AppState>) -> CmdResult<Vec<database::App>> {
    let db = state.db.lock().await;
    Ok(db.get_all_apps()?)
}

#[tauri::command]
async fn record_usage(
    state: State<'_, AppState>,
    app_name: String,
    duration_seconds: i64,
) -> CmdResult<()> {
    if duration_seconds < 0 {
        return Err(WellbeingError::Other(
            "Duration cannot be negative".to_string(),
        ));
    }
    let mut db = state.db.lock().await;
    db.record_usage_atomic(&app_name, duration_seconds)?;
    Ok(())
}

#[tauri::command]
async fn get_hourly_usage(state: State<'_, AppState>) -> CmdResult<Vec<HourlyUsage>> {
    let db = state.db.lock().await;
    Ok(db.get_hourly_usage()?)
}

#[derive(serde::Serialize)]
struct WeeklyHourlyUsage {
    date: String,
    hour: i32,
    total_seconds: i64,
}

#[tauri::command]
async fn get_weekly_hourly_usage(state: State<'_, AppState>) -> CmdResult<Vec<WeeklyHourlyUsage>> {
    let db = state.db.lock().await;
    let raw = db.get_weekly_hourly_usage()?;
    Ok(raw
        .into_iter()
        .map(|(date, hour, total_seconds)| WeeklyHourlyUsage {
            date,
            hour,
            total_seconds,
        })
        .collect())
}

#[tauri::command]
async fn get_category_usage(state: State<'_, AppState>) -> CmdResult<Vec<CategoryUsage>> {
    let db = state.db.lock().await;
    Ok(db.get_category_usage()?)
}

#[tauri::command]
async fn set_app_category(
    state: State<'_, AppState>,
    app_name: String,
    category: String,
) -> CmdResult<()> {
    if category.trim().is_empty() {
        return Err(WellbeingError::Other(
            "Category cannot be empty".to_string(),
        ));
    }
    if category.len() > 100 {
        return Err(WellbeingError::Other(
            "Category name too long (max 100 characters)".to_string(),
        ));
    }
    let db = state.db.lock().await;
    db.set_app_category(&app_name, &category)?;
    Ok(())
}

/// Validates an app name to prevent command injection
/// Only allows alphanumeric characters, spaces, hyphens, underscores, and dots
fn is_valid_app_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 256
        && name
            .chars()
            .all(|c| c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' || c == '.')
}

#[tauri::command]
async fn check_app_blocked(state: State<'_, AppState>, app_name: String) -> CmdResult<bool> {
    if !is_valid_app_name(&app_name) {
        return Err(WellbeingError::InvalidAppName(app_name));
    }
    let db = state.db.lock().await;
    Ok(db.is_app_blocked(&app_name)?)
}

#[tauri::command]
async fn get_blocked_apps(state: State<'_, AppState>) -> CmdResult<Vec<String>> {
    let current_app = state.tracker.lock().await.current_app().await;
    let apps = {
        let db = state.db.lock().await;
        db.get_blocked_apps()?
    };
    // Only return the blocked app if it matches the currently active window.
    // This prevents the popup from reappearing after the app has been closed.
    // Also filter out apps with active emergency access.
    let mut result = Vec::new();
    for app in apps {
        if let Some(ref current) = current_app {
            if app == *current && !state.emergency_access.has_active_access(&app).await {
                result.push(app);
            }
        }
    }
    Ok(result)
}

// Emergency access commands for limit popup
#[tauri::command]
async fn grant_emergency_access(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    app_name: String,
) -> CmdResult<i64> {
    if !is_valid_app_name(&app_name) {
        return Err(WellbeingError::InvalidAppName(app_name));
    }
    let focus_settings = state.focus_manager.get_settings().await;
    let duration_minutes = match focus_settings.emergency_access_minutes {
        15 => 15,
        20 => 20,
        _ => 10,
    } as i64;
    let duration_seconds = duration_minutes * 60;
    let expiry = state
        .emergency_access
        .grant_access(&app_name, duration_seconds)
        .await;

    // Invalidate the tracker's cached_blocked so it doesn't immediately re-trigger
    {
        let tracker = state.tracker.lock().await;
        tracker.invalidate_blocked_cache(&app_name).await;
    }
    {
        let bg_tracker = state.background_tracker.lock().await;
        if let Some(ref tracker) = *bg_tracker {
            tracker.invalidate_blocked_cache(&app_name).await;
        }
    }
    // Close the popup window
    state.popup_manager.close_popup(&app_handle).await;
    Ok(expiry)
}

#[tauri::command]
async fn get_emergency_access_remaining(
    state: State<'_, AppState>,
    app_name: String,
) -> CmdResult<i64> {
    if !is_valid_app_name(&app_name) {
        return Err(WellbeingError::InvalidAppName(app_name));
    }
    Ok(state.emergency_access.get_remaining_time(&app_name).await)
}

#[tauri::command]
async fn has_emergency_access(state: State<'_, AppState>, app_name: String) -> CmdResult<bool> {
    if !is_valid_app_name(&app_name) {
        return Err(WellbeingError::InvalidAppName(app_name));
    }
    Ok(state.emergency_access.has_active_access(&app_name).await)
}

#[tauri::command]
async fn quit_blocked_app(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    app_name: String,
) -> CmdResult<()> {
    if !is_valid_app_name(&app_name) {
        return Err(WellbeingError::InvalidAppName(app_name));
    }

    let tracker = state.tracker.lock().await;
    tracker.block_app(&app_name);
    drop(tracker);

    // Close the popup window
    state.popup_manager.close_popup(&app_handle).await;

    Ok(())
}

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

#[tauri::command]
async fn get_installed_apps() -> CmdResult<Vec<InstalledApp>> {
    Ok(app_scanner::get_installed_apps())
}

#[tauri::command]
async fn resolve_app_icon(icon_name: String) -> CmdResult<Option<String>> {
    Ok(app_scanner::resolve_icon_path(&icon_name))
}

#[tauri::command]
fn send_test_notification() -> CmdResult<()> {
    if notifications::send_notification(
        "Zenith",
        "Notifications are working! You will receive alerts when approaching or exceeding app limits.",
    ) {
        Ok(())
    } else {
        Err(WellbeingError::Notification(
            "Failed to send test notification. Check that your system notification service is available.".into(),
        ))
    }
}

#[tauri::command]
fn enable_autostart() -> CmdResult<String> {
    autostart::install_autostart().map_err(WellbeingError::Autostart)
}

#[tauri::command]
fn disable_autostart() -> CmdResult<String> {
    autostart::uninstall_autostart().map_err(WellbeingError::Autostart)
}

#[tauri::command]
fn get_autostart_status() -> CmdResult<AutostartStatus> {
    Ok(autostart::get_autostart_status())
}

/// Default data retention period in days
const DEFAULT_RETENTION_DAYS: i64 = 90;

#[tauri::command]
async fn wipe_all_data(state: State<'_, AppState>, confirmation_text: String) -> CmdResult<()> {
    if confirmation_text.trim() != "DELETE" {
        return Err(WellbeingError::Other(
            "Confirmation text mismatch. Type DELETE to confirm data wipe.".to_string(),
        ));
    }
    wipe_all_data_internal(state.inner()).await
}

async fn wipe_all_data_internal(state: &AppState) -> CmdResult<()> {
    let db = state.db.lock().await;
    db.wipe_all_data()?;
    drop(db);

    // Reset tracker state to avoid stale session IDs after wipe
    {
        let tracker = state.tracker.lock().await;
        tracker.reset_state().await;
    }

    {
        let background_tracker = state.background_tracker.lock().await;
        if let Some(ref tracker) = *background_tracker {
            tracker.reset_state().await;
        }
    }

    // Clear in-memory state
    let mut goals_state = state.goals_state.lock().await;
    *goals_state = goals::GoalsState::new();

    state.emergency_access.clear().await;

    // Clear persisted settings files and reset in-memory managers
    crate::settings_store::clear_all_settings_files()?;
    let _ = state
        .focus_manager
        .update_settings(FocusSettings::default())
        .await;
    state
        .break_reminder
        .update_settings(BreakSettings::default())
        .await;
    state
        .notification_manager
        .update_settings(NotificationSettings::default())
        .await;
    state.break_reminder.reset_timer().await;
    state.break_reminder.end_break().await;
    state.notification_manager.unmute();

    Ok(())
}

#[tauri::command]
fn save_export_file(file_path: String, content: String) -> CmdResult<()> {
    if file_path.trim().is_empty() {
        return Err(WellbeingError::Export("Export path is empty".into()));
    }

    if file_path.len() > 4096 || file_path.contains('\0') {
        return Err(WellbeingError::Export("Invalid export path".into()));
    }

    let path = std::path::PathBuf::from(&file_path);
    if !path.is_absolute() {
        return Err(WellbeingError::Export(
            "Export path must be absolute".into(),
        ));
    }

    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .ok_or_else(|| WellbeingError::Export("Export file must have an extension".into()))?;

    if extension != "csv" && extension != "json" {
        return Err(WellbeingError::Export(
            "Only CSV and JSON exports are allowed".into(),
        ));
    }

    let raw_parent = path
        .parent()
        .ok_or_else(|| {
            WellbeingError::Export("Export path must include a parent directory".into())
        })?
        .canonicalize()
        .map_err(|_| WellbeingError::Export("Export parent directory does not exist".into()))?;

    let canonical_parent_str = raw_parent.to_string_lossy();
    #[cfg(target_os = "windows")]
    let canonical_parent_str = canonical_parent_str
        .strip_prefix(r"\\?\UNC\")
        .map(|s| format!(r"\\{}", s))
        .or_else(|| {
            canonical_parent_str
                .strip_prefix(r"\\?\")
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| canonical_parent_str.to_string());

    let canonical_parent = std::path::PathBuf::from(canonical_parent_str.as_ref());

    let canonical_path = canonical_parent.join(
        path.file_name()
            .ok_or_else(|| WellbeingError::Export("Invalid export file name".into()))?,
    );

    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&canonical_path)
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::AlreadyExists {
                WellbeingError::Export(
                    "Export file already exists. Remove it first or choose a different name."
                        .into(),
                )
            } else {
                WellbeingError::Io(e)
            }
        })?;
    file.write_all(content.as_bytes())?;
    Ok(())
}

#[tauri::command]
async fn export_usage_data(
    state: State<'_, AppState>,
    start_date: String,
    end_date: String,
) -> CmdResult<Vec<ExportRecord>> {
    // Parse dates (YYYY-MM-DD format) and convert to timestamps
    let start_timestamp = chrono::NaiveDate::parse_from_str(&start_date, "%Y-%m-%d")
        .map_err(|e| WellbeingError::Export(format!("Invalid start date: {}", e)))?
        .and_hms_opt(0, 0, 0)
        .ok_or_else(|| WellbeingError::Export("Invalid start time".into()))?
        .and_utc()
        .timestamp();

    let end_timestamp = chrono::NaiveDate::parse_from_str(&end_date, "%Y-%m-%d")
        .map_err(|e| WellbeingError::Export(format!("Invalid end date: {}", e)))?
        .and_hms_opt(23, 59, 59)
        .ok_or_else(|| WellbeingError::Export("Invalid end time".into()))?
        .and_utc()
        .timestamp();

    let db = state.db.lock().await;
    Ok(db.export_usage_data(start_timestamp, end_timestamp)?)
}

#[tauri::command]
async fn import_usage_data(
    state: State<'_, AppState>,
    records: Vec<ExportRecord>,
) -> CmdResult<i64> {
    let mut db = state.db.lock().await;
    Ok(db.import_usage_data(&records)?)
}

/// Historical data response containing daily totals and app breakdown
#[derive(serde::Serialize)]
struct HistoricalData {
    daily_totals: Vec<DayStats>,
    app_usage: Vec<AppUsage>,
    category_usage: Vec<CategoryUsage>,
    total_seconds: i64,
}

#[tauri::command]
async fn get_historical_data(
    state: State<'_, AppState>,
    start_date: String,
    end_date: String,
) -> CmdResult<HistoricalData> {
    // Parse dates (YYYY-MM-DD format) and convert to timestamps
    let start_timestamp = chrono::NaiveDate::parse_from_str(&start_date, "%Y-%m-%d")
        .map_err(|e| WellbeingError::Export(format!("Invalid start date: {}", e)))?
        .and_hms_opt(0, 0, 0)
        .ok_or_else(|| WellbeingError::Export("Invalid start time".into()))?
        .and_utc()
        .timestamp();

    let end_timestamp = chrono::NaiveDate::parse_from_str(&end_date, "%Y-%m-%d")
        .map_err(|e| WellbeingError::Export(format!("Invalid end date: {}", e)))?
        .and_hms_opt(23, 59, 59)
        .ok_or_else(|| WellbeingError::Export("Invalid end time".into()))?
        .and_utc()
        .timestamp();

    let db = state.db.lock().await;

    // Get daily totals
    let raw_totals = db.get_daily_totals_in_range(start_timestamp, end_timestamp)?;
    let daily_totals: Vec<DayStats> = raw_totals
        .iter()
        .map(|(date_str, seconds)| {
            let timestamp = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
                .ok()
                .and_then(|d| d.and_hms_opt(12, 0, 0))
                .map(|dt| dt.and_utc().timestamp())
                .unwrap_or(0);

            DayStats {
                date: date_str.clone(),
                timestamp,
                total_seconds: *seconds,
            }
        })
        .collect();

    // Get app usage breakdown
    let app_usage = db.get_app_usage_in_range(start_timestamp, end_timestamp)?;

    // Get category usage breakdown
    let category_usage = db.get_category_usage_in_range(start_timestamp, end_timestamp)?;

    // Calculate total
    let total_seconds: i64 = daily_totals.iter().map(|d| d.total_seconds).sum();

    Ok(HistoricalData {
        daily_totals,
        app_usage,
        category_usage,
        total_seconds,
    })
}

#[tauri::command]
async fn minimize_to_tray(window: tauri::Window) -> CmdResult<()> {
    window
        .hide()
        .map_err(|e| WellbeingError::Other(e.to_string()))?;
    Ok(())
}

#[tauri::command]
async fn show_window(window: tauri::Window) -> CmdResult<()> {
    window
        .show()
        .map_err(|e| WellbeingError::Other(e.to_string()))?;
    window
        .set_focus()
        .map_err(|e| WellbeingError::Other(e.to_string()))?;
    Ok(())
}

// Break reminder commands
#[tauri::command]
async fn get_break_settings(state: State<'_, AppState>) -> CmdResult<BreakSettings> {
    Ok(state.break_reminder.get_settings().await)
}

#[tauri::command]
async fn set_break_settings(state: State<'_, AppState>, settings: BreakSettings) -> CmdResult<()> {
    state.break_reminder.update_settings(settings).await;
    Ok(())
}

#[tauri::command]
async fn get_break_status(state: State<'_, AppState>) -> CmdResult<BreakStatus> {
    let settings = state.break_reminder.get_settings().await;
    let minutes_worked = state.break_reminder.get_minutes_worked().await;
    let is_on_break = state.break_reminder.is_on_break();

    Ok(BreakStatus {
        enabled: settings.enabled,
        minutes_worked,
        work_minutes: settings.work_minutes,
        is_on_break,
    })
}

#[tauri::command]
async fn start_break(state: State<'_, AppState>) -> CmdResult<()> {
    state.break_reminder.start_break().await;
    Ok(())
}

#[tauri::command]
async fn end_break(state: State<'_, AppState>) -> CmdResult<()> {
    state.break_reminder.end_break().await;
    Ok(())
}

#[tauri::command]
async fn reset_break_timer(state: State<'_, AppState>) -> CmdResult<()> {
    state.break_reminder.reset_timer().await;
    Ok(())
}

// Notification settings commands
#[tauri::command]
async fn get_notification_settings(state: State<'_, AppState>) -> CmdResult<NotificationSettings> {
    Ok(state.notification_manager.get_settings().await)
}

#[tauri::command]
async fn set_notification_settings(
    state: State<'_, AppState>,
    settings: NotificationSettings,
) -> CmdResult<()> {
    state.notification_manager.update_settings(settings).await;
    Ok(())
}

#[tauri::command]
async fn mute_notifications(state: State<'_, AppState>) -> CmdResult<()> {
    state.notification_manager.mute();
    Ok(())
}

#[tauri::command]
async fn unmute_notifications(state: State<'_, AppState>) -> CmdResult<()> {
    state.notification_manager.unmute();
    Ok(())
}

#[tauri::command]
async fn is_notifications_muted(state: State<'_, AppState>) -> CmdResult<bool> {
    Ok(state.notification_manager.is_muted())
}

// Focus mode commands
#[tauri::command]
async fn get_focus_settings(state: State<'_, AppState>) -> CmdResult<FocusSettings> {
    Ok(state.focus_manager.get_settings().await)
}

#[tauri::command]
async fn set_focus_settings(state: State<'_, AppState>, settings: FocusSettings) -> CmdResult<()> {
    state.focus_manager.update_settings(settings).await
}

#[tauri::command]
async fn get_focus_session(state: State<'_, AppState>) -> CmdResult<FocusSession> {
    Ok(state.focus_manager.get_session().await)
}

#[tauri::command]
async fn start_focus_session(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    duration_minutes: Option<u32>,
    blocked_apps: Option<Vec<String>>,
) -> CmdResult<FocusSession> {
    let session = state
        .focus_manager
        .start_session(duration_minutes, blocked_apps)
        .await;
    let _ = app.emit("focus-session-changed", &session);
    Ok(session)
}

#[tauri::command]
async fn stop_focus_session(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> CmdResult<FocusSession> {
    let session = state.focus_manager.stop_session().await;
    let _ = app.emit("focus-session-changed", &session);
    Ok(session)
}

#[tauri::command]
async fn extend_focus_session(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    additional_minutes: u32,
) -> CmdResult<Option<FocusSession>> {
    let session = state.focus_manager.extend_session(additional_minutes).await;
    if let Some(ref session) = session {
        let _ = app.emit("focus-session-changed", session);
    }
    Ok(session)
}

#[tauri::command]
async fn is_focus_mode_active(state: State<'_, AppState>) -> CmdResult<bool> {
    Ok(state.focus_manager.is_active())
}

#[tauri::command]
async fn should_block_app_focus(state: State<'_, AppState>, app_name: String) -> CmdResult<bool> {
    Ok(state.focus_manager.should_block_app(&app_name).await)
}

#[tauri::command]
async fn add_focus_blocked_app(state: State<'_, AppState>, app_name: String) -> CmdResult<()> {
    if !is_valid_app_name(&app_name) {
        return Err(WellbeingError::InvalidAppName(app_name));
    }
    state.focus_manager.add_blocked_app(app_name).await;
    Ok(())
}

#[tauri::command]
async fn remove_focus_blocked_app(state: State<'_, AppState>, app_name: String) -> CmdResult<()> {
    if !is_valid_app_name(&app_name) {
        return Err(WellbeingError::InvalidAppName(app_name));
    }
    state.focus_manager.remove_blocked_app(&app_name).await;
    Ok(())
}

// Goals commands
#[tauri::command]
async fn get_goals(state: State<'_, AppState>) -> CmdResult<Vec<Goal>> {
    let goals_state = state.goals_state.lock().await;
    Ok(goals_state.goals.clone())
}

#[tauri::command]
async fn add_goal(state: State<'_, AppState>, goal: Goal) -> CmdResult<()> {
    let mut goals_state = state.goals_state.lock().await;
    goals_state.add_goal(goal);
    Ok(())
}

#[tauri::command]
async fn update_goal(state: State<'_, AppState>, goal: Goal) -> CmdResult<()> {
    let mut goals_state = state.goals_state.lock().await;
    goals_state.update_goal(goal);
    Ok(())
}

#[tauri::command]
async fn remove_goal(state: State<'_, AppState>, goal_id: String) -> CmdResult<()> {
    let mut goals_state = state.goals_state.lock().await;
    goals_state.remove_goal(&goal_id);
    Ok(())
}

#[tauri::command]
async fn get_goals_progress(state: State<'_, AppState>) -> CmdResult<Vec<GoalProgress>> {
    let db = state.db.lock().await;
    let goals_state = state.goals_state.lock().await;

    // Get today's usage data
    let apps = db.get_daily_usage()?;
    let categories = db.get_category_usage()?;

    let total_daily_minutes = (apps.iter().map(|a| a.duration_seconds).sum::<i64>() / 60) as i32;

    // Build usage maps
    let app_usage: HashMap<String, i32> = apps
        .iter()
        .map(|a| (a.app_name.clone(), (a.duration_seconds / 60) as i32))
        .collect();

    let category_usage: HashMap<String, i32> = categories
        .iter()
        .map(|c| (c.category.clone(), (c.total_seconds / 60) as i32))
        .collect();

    // Calculate progress for each goal
    let today = chrono::Local::now().date_naive();
    let progress: Vec<GoalProgress> = goals_state
        .get_goals_for_day(today)
        .iter()
        .map(|goal| {
            goals::calculate_goal_progress(goal, total_daily_minutes, &app_usage, &category_usage)
        })
        .collect();

    Ok(progress)
}

#[tauri::command]
async fn get_achievements(state: State<'_, AppState>) -> CmdResult<Vec<Achievement>> {
    let goals_state = state.goals_state.lock().await;
    Ok(goals_state.get_achievements())
}

#[tauri::command]
async fn get_goals_stats(state: State<'_, AppState>) -> CmdResult<GoalsStats> {
    let goals_state = state.goals_state.lock().await;
    Ok(GoalsStats {
        current_streak: goals_state.current_streak,
        longest_streak: goals_state.longest_streak,
        total_goals_met: goals_state.total_goals_met,
        focus_sessions_completed: goals_state.focus_sessions_completed,
    })
}

// Focus notes commands
#[tauri::command]
async fn save_focus_note(
    state: State<'_, AppState>,
    content: String,
    duration_minutes: i32,
) -> CmdResult<i64> {
    let db = state.db.lock().await;
    let now = chrono::Utc::now().timestamp();
    db.save_focus_note(now, &content, duration_minutes)
        .map_err(Into::into)
}

#[tauri::command]
async fn get_focus_notes(state: State<'_, AppState>) -> CmdResult<Vec<database::FocusNote>> {
    let db = state.db.lock().await;
    db.get_focus_notes().map_err(Into::into)
}

#[tauri::command]
async fn init_onboarding_goals(
    state: State<'_, AppState>,
    daily_goal_minutes: i32,
    screen_limit_hours: i32,
) -> CmdResult<()> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let mut goals_state = state.goals_state.lock().await;

    goals_state.goals = vec![
        Goal {
            id: "onboarding-daily-screen".to_string(),
            name: "Daily Screen Time".to_string(),
            goal_type: GoalType::DailyLimit,
            target_minutes: screen_limit_hours * 60,
            days: vec![1, 2, 3, 4, 5, 6, 0],
            enabled: true,
            created_at: today.clone(),
        },
        Goal {
            id: "onboarding-deep-work".to_string(),
            name: "Deep Work".to_string(),
            goal_type: GoalType::MinimumProductive {
                category: "Development".to_string(),
            },
            target_minutes: daily_goal_minutes,
            days: vec![1, 2, 3, 4, 5, 6, 0],
            enabled: true,
            created_at: today,
        },
    ];

    Ok(())
}

#[derive(serde::Serialize)]
struct GoalsStats {
    current_streak: i32,
    longest_streak: i32,
    total_goals_met: i32,
    focus_sessions_completed: i32,
}

#[derive(serde::Serialize)]
struct BreakStatus {
    enabled: bool,
    minutes_worked: u32,
    work_minutes: u32,
    is_on_break: bool,
}

#[derive(serde::Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

/// Check if a new app version is available.
/// Returns Some(UpdateInfo) if an update exists, None if already up to date or
/// if the update endpoint is unreachable / has no release yet.
#[tauri::command]
async fn check_for_update(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app
        .updater()
        .map_err(|e: tauri_plugin_updater::Error| e.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => Ok(Some(UpdateInfo {
            version: update.version.clone(),
            body: update.body.clone(),
            date: update.date.as_ref().map(|d| format!("{}", d)),
        })),
        Ok(None) => Ok(None),
        Err(e) => {
            let msg = e.to_string();
            // Treat "no valid release JSON" as "no update" — this happens when no
            // release has been published yet or the endpoint returns a non-200.
            if msg.contains("did not respond with a successful status code")
                || msg.contains("no valid release JSON")
                || msg.contains("invalid status code")
                || msg.contains("404")
            {
                tracing::debug!(error = %msg, "Update endpoint returned no release, treating as up-to-date");
                Ok(None)
            } else {
                Err(msg)
            }
        }
    }
}

/// Download and install the pending update, emitting progress events.
/// After installation completes the app will relaunch automatically.
#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app
        .updater()
        .map_err(|e: tauri_plugin_updater::Error| e.to_string())?;

    let update = updater
        .check()
        .await
        .map_err(|e: tauri_plugin_updater::Error| e.to_string())?
        .ok_or_else(|| "No update available".to_string())?;

    let app_handle = app.clone();
    update
        .download_and_install(
            move |chunk_length: usize, content_length: Option<u64>| {
                let _ = app_handle.emit(
                    "update-download-progress",
                    serde_json::json!({
                        "chunkLength": chunk_length,
                        "contentLength": content_length,
                    }),
                );
            },
            || {},
        )
        .await
        .map_err(|e: tauri_plugin_updater::Error| e.to_string())?;

    app.restart();
}

/// Try to acquire exclusive file lock for window tracking
fn try_acquire_tracking_lock(parent: &std::path::Path) -> Option<std::fs::File> {
    let lock_path = parent.join("zenith.lock");
    match std::fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(false)
        .open(&lock_path)
    {
        Ok(lock_file) => {
            if lock_file.try_lock_exclusive().is_ok() {
                Some(lock_file)
            } else {
                None
            }
        }
        Err(e) => {
            tracing::warn!(error = %e, path = %lock_path.display(), "Failed to open tracking lock file");
            None
        }
    }
}

/// Run the app in headless background mode (no GUI window)
/// This is used by the autostart service to track usage silently
pub fn run_background() {
    // Initialize tracing subscriber for background mode
    init_tracing();

    tracing::info!("Starting Zenith in background mode...");

    let db_path = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("zenith")
        .join("zenith.db");

    if let Some(parent) = db_path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            tracing::error!(error = %e, path = %parent.display(), "Failed to create data directory");
            return;
        }

        // Single-instance file lock check for background processes
        if let Some(lock_file) = try_acquire_tracking_lock(parent) {
            // Keep lock_file alive for the lifetime of run_background
            std::mem::forget(lock_file);
        } else {
            tracing::warn!(
                "Another Zenith process is already running. Exiting duplicate background process."
            );
            return;
        }
    }

    let db = match Database::new(db_path) {
        Ok(db) => db,
        Err(e) => {
            tracing::error!(error = %e, "Failed to initialize database");
            return;
        }
    };
    let db = Arc::new(Mutex::new(db));

    // Create emergency access manager (limited functionality in background mode)
    let emergency_access = Arc::new(EmergencyAccessManager::new());
    let focus_manager = Arc::new(FocusManager::new());

    // Create tokio runtime for async operations
    let rt = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(e) => {
            tracing::error!(error = %e, "Failed to create tokio runtime");
            return;
        }
    };

    rt.block_on(async {
        let popup_manager = Arc::new(PopupManager::new());
        let tracker = Arc::new(UsageTracker::new(
            db,
            emergency_access,
            focus_manager,
            popup_manager,
        ));
        let tracker_for_shutdown = Arc::clone(&tracker);

        tracing::info!("Background tracker started. Press Ctrl+C to stop.");

        // Set up graceful shutdown on SIGTERM/SIGINT
        let shutdown_signal = async {
            #[cfg(unix)]
            {
                use tokio::signal::unix::{signal, SignalKind};
                let mut sigterm = match signal(SignalKind::terminate()) {
                    Ok(sig) => sig,
                    Err(e) => {
                        tracing::error!(error = %e, "Failed to register SIGTERM handler");
                        return;
                    }
                };
                let mut sigint = match signal(SignalKind::interrupt()) {
                    Ok(sig) => sig,
                    Err(e) => {
                        tracing::error!(error = %e, "Failed to register SIGINT handler");
                        return;
                    }
                };
                tokio::select! {
                    _ = sigterm.recv() => tracing::info!("Received SIGTERM"),
                    _ = sigint.recv() => tracing::info!("Received SIGINT"),
                }
            }
            #[cfg(not(unix))]
            {
                if let Err(e) = tokio::signal::ctrl_c().await {
                    tracing::error!(error = %e, "Failed to register Ctrl+C handler");
                    return;
                }
                tracing::info!("Received Ctrl+C");
            }
        };

        tokio::select! {
            _ = tracker.start_tracking() => {
                // start_tracking runs forever, this branch is unreachable
            }
            _ = shutdown_signal => {
                tracing::info!("Shutting down, finalizing current session...");
                tracker_for_shutdown.finalize_current_session().await;
                tracing::info!("Session finalized. Goodbye.");
            }
        }
    });
}

/// Initialize the tracing subscriber for the application
fn init_tracing() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize tracing for structured logging
    init_tracing();

    let db_path = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("zenith")
        .join("zenith.db");

    let lock_dir = db_path
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    if let Err(e) = std::fs::create_dir_all(&lock_dir) {
        tracing::error!(error = %e, path = %lock_dir.display(), "Failed to create data directory");
        return;
    }

    let db = match Database::new(db_path) {
        Ok(db) => db,
        Err(e) => {
            tracing::error!(error = %e, "Failed to initialize database");
            return;
        }
    };
    let db = Arc::new(Mutex::new(db));

    // Create break reminder
    let break_reminder = Arc::new(BreakReminder::new());

    // Create notification manager
    let notification_manager = Arc::new(NotificationManager::new());

    // Create focus manager
    let focus_manager = Arc::new(FocusManager::new());

    // Create goals state
    let goals_state = Arc::new(Mutex::new(GoalsState::new()));

    // Create emergency access manager
    let emergency_access = Arc::new(EmergencyAccessManager::new());

    // Create popup manager for limit enforcement popups
    let popup_manager = Arc::new(PopupManager::new());

    // Clone for background tasks
    let tracker_db = Arc::clone(&db);
    let cleanup_db = Arc::clone(&db);
    let tracker_emergency = Arc::clone(&emergency_access);
    let break_reminder_clone = Arc::clone(&break_reminder);
    let focus_manager_clone = Arc::clone(&focus_manager);
    let notification_manager_clone = Arc::clone(&notification_manager);
    let popup_manager_for_tracker = Arc::clone(&popup_manager);
    let popup_manager_for_bg = Arc::clone(&popup_manager);

    // Create tracker (will be set with app handle in setup)
    // This tracker is used for state management (emergency access commands)
    let tracker = Arc::new(Mutex::new(UsageTracker::new(
        Arc::clone(&db),
        Arc::clone(&emergency_access),
        Arc::clone(&focus_manager),
        popup_manager_for_tracker,
    )));
    let tracker_for_state = Arc::clone(&tracker);

    // Shared slot for the background tracker, filled during setup()
    let background_tracker_slot: Arc<Mutex<Option<Arc<UsageTracker>>>> = Arc::new(Mutex::new(None));
    let background_tracker_for_state = Arc::clone(&background_tracker_slot);

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .manage(AppState {
            db,
            break_reminder,
            notification_manager,
            focus_manager,
            goals_state,
            emergency_access: Arc::clone(&tracker_emergency),
            popup_manager: Arc::clone(&popup_manager),
            tracker: tracker_for_state,
            background_tracker: background_tracker_for_state,
        })
        .setup(move |app| {
            // Initialize system tray
            if let Err(e) = tray::create_tray(app.handle()) {
                tracing::error!(error = %e, "Failed to create system tray");
            }

            // On Windows, allow the asset protocol to serve icon files from
            // common program directories (registry DisplayIcon paths point here).
            #[cfg(target_os = "windows")]
            {
                let asset_scope = app.asset_protocol_scope();
                let win_icon_dirs = [
                    std::env::var("ProgramFiles").ok(),
                    std::env::var("ProgramFiles(x86)").ok(),
                    std::env::var("ProgramW6432").ok(),
                    std::env::var("LocalAppData").ok(),
                    std::env::var("AppData").ok(),
                ];
                for dir in win_icon_dirs.iter().flatten() {
                    let path = std::path::PathBuf::from(dir);
                    if path.exists() {
                        if let Err(e) = asset_scope.allow_directory(&path, true) {
                            tracing::warn!(dir = %path.display(), error = %e, "Failed to allow icon dir");
                        }
                    }
                }
            }

            // On Linux, also allow icon directories at runtime so that $HOME
            // is resolved correctly and covers paths the static config may miss.
            #[cfg(target_os = "linux")]
            {
                let asset_scope = app.asset_protocol_scope();
                let mut linux_icon_dirs: Vec<std::path::PathBuf> = vec![
                    std::path::PathBuf::from("/usr/share"),
                    std::path::PathBuf::from("/usr/share/icons"),
                    std::path::PathBuf::from("/usr/share/pixmaps"),
                    std::path::PathBuf::from("/var/lib/flatpak/exports/share/icons"),
                    std::path::PathBuf::from("/var/lib/flatpak/app"),
                    std::path::PathBuf::from("/app/share"),
                    std::path::PathBuf::from("/opt"),
                ];
                if let Some(home) = dirs::home_dir() {
                    linux_icon_dirs.push(home.join(".local/share/icons"));
                    linux_icon_dirs.push(home.join(".icons"));
                    linux_icon_dirs.push(home.join(".local/share/flatpak/exports/share/icons"));
                    linux_icon_dirs.push(home.join(".local/share/flatpak/app"));
                    linux_icon_dirs.push(home.join(".local/share/applications/icons"));
                }
                for dir in &linux_icon_dirs {
                    if dir.exists() {
                        if let Err(e) = asset_scope.allow_directory(dir, true) {
                            tracing::warn!(dir = %dir.display(), error = %e, "Failed to allow Linux icon dir");
                        }
                    }
                }
            }

            // Create the background tracker with app handle and notification manager
            let handle = app.handle().clone();
            let emergency_for_tracker = Arc::clone(&tracker_emergency);
            let notification_manager_for_tracker = Arc::clone(&notification_manager_clone);

            // Create the background tracker as an Arc so we can share it for shutdown
            let mut background_tracker =
                UsageTracker::new(tracker_db, emergency_for_tracker, Arc::clone(&focus_manager_clone), popup_manager_for_bg);
            background_tracker.set_app_handle(handle.clone());
            background_tracker.set_notification_manager(notification_manager_for_tracker);
            let background_tracker = Arc::new(background_tracker);

            // Store the background tracker for graceful shutdown
            {
                let mut slot = background_tracker_slot.blocking_lock();
                *slot = Some(Arc::clone(&background_tracker));
            }

            let background_tracker_for_task = Arc::clone(&background_tracker);
            if let Some(lock_file) = try_acquire_tracking_lock(&lock_dir) {
                tracing::info!("Acquired tracking lock in GUI process. Spawning window tracker.");
                tauri::async_runtime::spawn(async move {
                    background_tracker_for_task.start_tracking().await;
                });
                std::mem::forget(lock_file);
            } else {
                tracing::info!("Background tracker is already running in another process. Skipping GUI window tracker spawn.");
            }

            // Run data cleanup on startup (delete data older than 90 days)
            tauri::async_runtime::spawn(async move {
                let db = cleanup_db.lock().await;
                match db.cleanup_old_data(DEFAULT_RETENTION_DAYS) {
                    Ok(deleted) if deleted > 0 => {
                        tracing::info!(deleted_sessions = deleted, "Cleaned up old usage sessions");
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "Failed to cleanup old data");
                    }
                    _ => {}
                }
            });

            // Start break reminder background task
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
                loop {
                    interval.tick().await;
                    if let Some(notification) = break_reminder_clone.tick().await {
                        notification.send();
                        tracing::info!("Break reminder notification sent");
                    }
                }
            });

            // Start focus mode background task (check schedules and session expiry)
            let focus_task_app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
                loop {
                    interval.tick().await;
                    if let Some(event) = focus_manager_clone.tick().await {
                        match event {
                            focus_mode::FocusEvent::ScheduleStarted(schedule) => {
                                tracing::info!(schedule = %schedule.name, "Starting scheduled focus session");
                                focus_manager_clone.start_scheduled_session(&schedule).await;
                                let session = focus_manager_clone.get_session().await;
                                let _ = focus_task_app_handle.emit("focus-session-changed", &session);
                            }
                            focus_mode::FocusEvent::ScheduleEnded => {
                                tracing::info!("Scheduled focus session ended");
                                let session = focus_manager_clone.stop_session().await;
                                let _ = focus_task_app_handle.emit("focus-session-changed", &session);
                            }
                            focus_mode::FocusEvent::SessionExpired => {
                                tracing::info!("Focus session expired");
                                let session = focus_manager_clone.stop_session().await;
                                let _ = focus_task_app_handle.emit("focus-session-changed", &session);
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_daily_usage,
            get_weekly_stats,
            set_app_limit,
            get_app_limits,
            remove_app_limit,
            get_all_apps,
            record_usage,
            get_hourly_usage,
            get_weekly_hourly_usage,
            get_category_usage,
            set_app_category,
            check_app_blocked,
            get_blocked_apps,
            grant_emergency_access,
            get_emergency_access_remaining,
            has_emergency_access,
            quit_blocked_app,
            get_installed_apps,
            get_system_info,
            resolve_app_icon,
            send_test_notification,
            enable_autostart,
            disable_autostart,
            get_autostart_status,
            wipe_all_data,
            save_export_file,
            export_usage_data,
            import_usage_data,
            get_historical_data,
            minimize_to_tray,
            show_window,
            get_break_settings,
            set_break_settings,
            get_break_status,
            start_break,
            end_break,
            reset_break_timer,
            get_notification_settings,
            set_notification_settings,
            mute_notifications,
            unmute_notifications,
            is_notifications_muted,
            get_focus_settings,
            set_focus_settings,
            get_focus_session,
            start_focus_session,
            stop_focus_session,
            extend_focus_session,
            is_focus_mode_active,
            should_block_app_focus,
            add_focus_blocked_app,
            remove_focus_blocked_app,
            get_goals,
            add_goal,
            update_goal,
            remove_goal,
            get_goals_progress,
            get_achievements,
            get_goals_stats,
            save_focus_note,
            get_focus_notes,
            init_onboarding_goals,
            check_for_update,
            install_update
        ])
        .build(tauri::generate_context!());

    let app = match app {
        Ok(app) => app,
        Err(e) => {
            tracing::error!(error = %e, "error while building tauri application");
            return;
        }
    };

    app.run(move |app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            // Graceful shutdown: finalize the current tracking session
            // so we don't lose data for the session that was active at exit time
            tracing::info!("App exiting, finalizing tracking session...");
            let state: tauri::State<'_, AppState> = app_handle.state();
            let bg_tracker = state.background_tracker.clone();
            // Use blocking_lock since we're in the exit handler (not async context)
            let tracker_opt = bg_tracker.blocking_lock();
            if let Some(ref tracker) = *tracker_opt {
                let tracker: Arc<UsageTracker> = Arc::clone(tracker);
                // Run finalization synchronously to ensure it completes before exit
                let rt = tokio::runtime::Handle::try_current();
                match rt {
                    Ok(handle) => {
                        handle.block_on(tracker.finalize_current_session());
                    }
                    Err(_) => {
                        // No runtime available, create one
                        let rt = tokio::runtime::Runtime::new();
                        if let Ok(rt) = rt {
                            rt.block_on(tracker.finalize_current_session());
                        }
                    }
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::Mutex;

    #[test]
    fn test_system_info_fields_not_empty() {
        let os = get_os_name();
        let de = get_desktop_environment();
        assert!(!os.is_empty(), "OS name should not be empty");
        assert!(!de.is_empty(), "Desktop environment should not be empty");
    }

    #[test]
    fn test_valid_app_names() {
        assert!(is_valid_app_name("Firefox"));
        assert!(is_valid_app_name("Visual Studio Code"));
        assert!(is_valid_app_name("my-app"));
        assert!(is_valid_app_name("my_app"));
        assert!(is_valid_app_name("app.name"));
        assert!(is_valid_app_name("App123"));
    }

    #[test]
    fn test_invalid_app_names() {
        // Empty
        assert!(!is_valid_app_name(""));

        // Contains shell metacharacters
        assert!(!is_valid_app_name("app; rm -rf /"));
        assert!(!is_valid_app_name("app && malicious"));
        assert!(!is_valid_app_name("app | cat /etc/passwd"));
        assert!(!is_valid_app_name("$(whoami)"));
        assert!(!is_valid_app_name("`id`"));
        assert!(!is_valid_app_name("app\nmalicious"));

        // Contains special characters
        assert!(!is_valid_app_name("app<>"));
        assert!(!is_valid_app_name("app!@#$%"));
    }

    #[test]
    fn test_app_name_length_limit() {
        // 256 chars is the limit
        let valid_long = "a".repeat(256);
        assert!(is_valid_app_name(&valid_long));

        // 257 chars exceeds limit
        let invalid_long = "a".repeat(257);
        assert!(!is_valid_app_name(&invalid_long));
    }

    #[test]
    fn test_app_name_unicode() {
        // Unicode letters should be valid (alphanumeric includes unicode)
        assert!(is_valid_app_name("アプリ")); // Japanese
        assert!(is_valid_app_name("应用程序")); // Chinese
        assert!(is_valid_app_name("приложение")); // Russian
    }

    #[tokio::test]
    async fn test_tracker_reset_clears_runtime_state() {
        let db = Arc::new(Mutex::new(Database::new_in_memory().expect("in-memory db")));
        let emergency = Arc::new(EmergencyAccessManager::new());
        let focus_manager = Arc::new(FocusManager::new());
        let popup_manager = Arc::new(PopupManager::new());
        let tracker = UsageTracker::new(db, emergency, focus_manager, popup_manager);

        tracker
            .set_test_state(Some("Firefox".to_string()), Some(123), Some(456))
            .await;

        tracker.reset_state().await;
        let snapshot = tracker.test_state_snapshot().await;

        assert!(snapshot.0.is_none());
        assert!(snapshot.1.is_none());
        assert!(snapshot.2.is_none());
        assert_eq!(snapshot.3, 0);
        assert_eq!(snapshot.4, 0);
    }

    #[tokio::test]
    async fn test_wipe_all_data_internal_clears_db_and_runtime_state() {
        let db = Arc::new(Mutex::new(Database::new_in_memory().expect("in-memory db")));
        {
            let db_guard = db.lock().await;
            let app_id = db_guard
                .get_or_create_app("Firefox", None)
                .expect("create app");
            db_guard
                .start_session(app_id, chrono::Utc::now().timestamp() - 60)
                .expect("create session");
            db_guard
                .set_limit_with_block("Firefox", 60, true)
                .expect("set limit");
        }

        let emergency_access = Arc::new(EmergencyAccessManager::new());
        emergency_access.grant_access("Firefox", 600).await;

        let focus_manager = Arc::new(FocusManager::new());
        let popup_manager = Arc::new(PopupManager::new());
        let tracker = Arc::new(Mutex::new(UsageTracker::new(
            Arc::clone(&db),
            Arc::clone(&emergency_access),
            Arc::clone(&focus_manager),
            Arc::clone(&popup_manager),
        )));
        {
            let tracker_guard = tracker.lock().await;
            tracker_guard
                .set_test_state(Some("Firefox".to_string()), Some(1), Some(2))
                .await;
        }

        let background_tracker = Arc::new(UsageTracker::new(
            Arc::clone(&db),
            Arc::clone(&emergency_access),
            Arc::clone(&focus_manager),
            Arc::clone(&popup_manager),
        ));
        background_tracker
            .set_test_state(Some("Code".to_string()), Some(9), Some(10))
            .await;

        let mut goals_state = GoalsState::new();
        goals_state.add_goal(Goal {
            id: "goal-1".to_string(),
            name: "Limit distractions".to_string(),
            goal_type: goals::GoalType::DailyLimit,
            target_minutes: 60,
            days: vec![],
            enabled: true,
            created_at: chrono::Local::now().format("%Y-%m-%d").to_string(),
        });

        let state = AppState {
            db: Arc::clone(&db),
            break_reminder: Arc::new(BreakReminder::new()),
            notification_manager: Arc::new(NotificationManager::new()),
            focus_manager,
            goals_state: Arc::new(Mutex::new(goals_state)),
            emergency_access: Arc::clone(&emergency_access),
            popup_manager,
            tracker: Arc::clone(&tracker),
            background_tracker: Arc::new(Mutex::new(Some(Arc::clone(&background_tracker)))),
        };

        wipe_all_data_internal(&state).await.expect("wipe succeeds");

        {
            let db_guard = db.lock().await;
            assert_eq!(db_guard.get_all_apps().expect("apps").len(), 0);
            assert_eq!(db_guard.get_all_limits().expect("limits").len(), 0);
            assert_eq!(db_guard.get_daily_usage().expect("usage").len(), 0);
        }

        {
            let tracker_guard = tracker.lock().await;
            let snapshot = tracker_guard.test_state_snapshot().await;
            assert!(snapshot.0.is_none());
            assert!(snapshot.1.is_none());
            assert!(snapshot.2.is_none());
            assert_eq!(snapshot.3, 0);
            assert_eq!(snapshot.4, 0);
        }

        let bg_snapshot = background_tracker.test_state_snapshot().await;
        assert!(bg_snapshot.0.is_none());
        assert!(bg_snapshot.1.is_none());
        assert!(bg_snapshot.2.is_none());
        assert_eq!(bg_snapshot.3, 0);
        assert_eq!(bg_snapshot.4, 0);

        assert!(!emergency_access.has_active_access("Firefox").await);

        let goals_guard = state.goals_state.lock().await;
        assert_eq!(goals_guard.goals.len(), 5);
        assert!(!goals_guard.goals.iter().any(|g| g.id == "goal-1"));
    }

    #[test]
    fn test_try_acquire_tracking_lock_prevents_duplicate() {
        let test_dir =
            std::env::temp_dir().join(format!("zenith_test_lock_{}", std::process::id()));
        let _ = std::fs::create_dir_all(&test_dir);

        let lock1 = try_acquire_tracking_lock(&test_dir);
        assert!(lock1.is_some(), "First lock attempt should succeed");

        let lock2 = try_acquire_tracking_lock(&test_dir);
        assert!(
            lock2.is_none(),
            "Second lock attempt should fail while first is held"
        );

        drop(lock1);
        let lock3 = try_acquire_tracking_lock(&test_dir);
        assert!(
            lock3.is_some(),
            "Lock attempt after dropping first lock should succeed"
        );

        drop(lock3);
        let _ = std::fs::remove_dir_all(&test_dir);
    }
}
