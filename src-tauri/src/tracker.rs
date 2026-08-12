use crate::database::Database;
use crate::focus_mode::FocusManager;
use crate::limit_popup::EmergencyAccessManager;
use crate::notification_settings::NotificationManager;
use crate::popup_manager::PopupManager;
use crate::window_tracker::{extract_app_name, get_active_window_name};
use std::collections::HashMap;
use std::process::Command;
use std::sync::Arc;
use std::time::Duration;
use tauri::AppHandle;
use tokio::sync::Mutex;
use tokio::time::interval;

/// Notification thresholds
const WARNING_THRESHOLD: f64 = 0.8; // 80% - send warning
const EXCEEDED_THRESHOLD: f64 = 1.0; // 100% - limit exceeded
const IDLE_THRESHOLD_SECONDS: u64 = 300; // 5 minutes

/// How often (in seconds) to re-check if an app is blocked
const BLOCKED_CHECK_CACHE_SECONDS: i64 = 10;

/// How often (in seconds) to flush session duration to DB
const SESSION_FLUSH_INTERVAL: u32 = 5;

/// Maximum number of failed writes to buffer before dropping oldest
const MAX_RETRY_BUFFER_SIZE: usize = 100;

/// Windows display-name -> process exe name (sans .exe). Fallback is the display name.
#[cfg(target_os = "windows")]
const WINDOWS_EXE_ALIASES: &[(&str, &str)] = &[
    ("visual studio code", "Code"),
    ("code", "Code"),
    ("google chrome", "chrome"),
    ("chrome", "chrome"),
    ("mozilla firefox", "firefox"),
    ("firefox", "firefox"),
    ("microsoft edge", "msedge"),
    ("edge", "msedge"),
    ("windows terminal", "WindowsTerminal"),
    ("notepad++", "notepad++"),
    ("sublime text", "sublime_text"),
    ("slack", "slack"),
    ("spotify", "Spotify"),
    ("discord", "Discord"),
    ("steam", "steam"),
    ("brave", "brave"),
    ("vscodium", "codium"),
    ("zed", "zed"),
];

/// Notification types to track what we've already sent
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum NotificationType {
    Warning,  // 80% threshold
    Exceeded, // 100% threshold
}

/// A pending DB operation that failed and needs retry
#[derive(Debug, Clone)]
#[allow(dead_code)]
enum PendingWrite {
    /// Update session duration: (session_id, end_time)
    UpdateSession { session_id: i64, end_time: i64 },
    /// Record a complete session atomically: (app_name, duration_seconds)
    RecordSession {
        app_name: String,
        duration_seconds: i64,
    },
}

pub struct UsageTracker {
    db: Arc<Mutex<Database>>,
    current_app: Arc<Mutex<Option<String>>>,
    current_session_id: Arc<Mutex<Option<i64>>>,
    session_start: Arc<Mutex<Option<i64>>>,
    /// Track which notifications have been sent for each app today
    /// Key: (app_name, notification_type), Value: true if sent
    sent_notifications: Arc<Mutex<HashMap<(String, NotificationType), bool>>>,
    /// The date we last reset notifications (to reset daily)
    last_reset_date: Arc<Mutex<String>>,
    /// Emergency access manager for temporary access grants
    emergency_access: Arc<EmergencyAccessManager>,
    /// Notification manager for DND/mute-aware notifications
    notification_manager: Option<Arc<NotificationManager>>,
    /// Tauri app handle for emitting events
    app_handle: Option<AppHandle>,
    /// Focus manager for focus-mode blocking rules
    focus_manager: Arc<FocusManager>,
    /// Counter for session flush interval (avoids unreliable modulo on timestamps)
    flush_counter: Arc<Mutex<u32>>,
    /// Buffer of failed DB writes to retry
    retry_buffer: Arc<Mutex<Vec<PendingWrite>>>,
    /// Track the last successfully written end_time to detect data gaps
    last_written_end_time: Arc<Mutex<Option<i64>>>,
    /// Cache for is_app_blocked results to avoid DB queries every tick.
    cached_blocked: Arc<Mutex<HashMap<String, (bool, i64)>>>,
    popup_manager: Arc<PopupManager>,
}

impl UsageTracker {
    pub fn new(
        db: Arc<Mutex<Database>>,
        emergency_access: Arc<EmergencyAccessManager>,
        focus_manager: Arc<FocusManager>,
        popup_manager: Arc<PopupManager>,
    ) -> Self {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        UsageTracker {
            db,
            current_app: Arc::new(Mutex::new(None)),
            current_session_id: Arc::new(Mutex::new(None)),
            session_start: Arc::new(Mutex::new(None)),
            sent_notifications: Arc::new(Mutex::new(HashMap::new())),
            last_reset_date: Arc::new(Mutex::new(today)),
            emergency_access,
            notification_manager: None,
            app_handle: None,
            focus_manager,
            flush_counter: Arc::new(Mutex::new(0)),
            retry_buffer: Arc::new(Mutex::new(Vec::new())),
            last_written_end_time: Arc::new(Mutex::new(None)),
            cached_blocked: Arc::new(Mutex::new(HashMap::new())),
            popup_manager,
        }
    }

    /// Reset runtime tracking state after destructive operations like wipe.
    pub async fn reset_state(&self) {
        *self.current_app.lock().await = None;
        *self.current_session_id.lock().await = None;
        *self.session_start.lock().await = None;
        *self.flush_counter.lock().await = 0;
        *self.last_written_end_time.lock().await = None;
        self.sent_notifications.lock().await.clear();
        self.retry_buffer.lock().await.clear();
        self.cached_blocked.lock().await.clear();
    }

    #[cfg(test)]
    pub async fn set_test_state(
        &self,
        current_app: Option<String>,
        session_id: Option<i64>,
        session_start: Option<i64>,
    ) {
        *self.current_app.lock().await = current_app;
        *self.current_session_id.lock().await = session_id;
        *self.session_start.lock().await = session_start;
        *self.flush_counter.lock().await = 3;
        *self.last_written_end_time.lock().await = Some(12345);
        self.sent_notifications
            .lock()
            .await
            .insert(("test".to_string(), NotificationType::Warning), true);
        self.retry_buffer
            .lock()
            .await
            .push(PendingWrite::UpdateSession {
                session_id: 42,
                end_time: 9999,
            });
    }

    #[cfg(test)]
    pub async fn test_state_snapshot(
        &self,
    ) -> (Option<String>, Option<i64>, Option<i64>, usize, usize) {
        let app = self.current_app.lock().await.clone();
        let session = *self.current_session_id.lock().await;
        let start = *self.session_start.lock().await;
        let notifications_len = self.sent_notifications.lock().await.len();
        let retry_len = self.retry_buffer.lock().await.len();
        (app, session, start, notifications_len, retry_len)
    }

    /// Set the Tauri app handle for emitting events
    pub fn set_app_handle(&mut self, handle: AppHandle) {
        self.app_handle = Some(handle);
    }

    /// Set the notification manager for DND/mute-aware notifications
    pub fn set_notification_manager(&mut self, manager: Arc<NotificationManager>) {
        self.notification_manager = Some(manager);
    }

    /// Get a clone of the app handle
    pub fn app_handle_clone(&self) -> Option<AppHandle> {
        self.app_handle.clone()
    }

    /// Get the currently tracked app name (the active window)
    pub async fn current_app(&self) -> Option<String> {
        self.current_app.lock().await.clone()
    }

    /// Get a reference to the emergency access manager
    pub fn emergency_access(&self) -> &Arc<EmergencyAccessManager> {
        &self.emergency_access
    }

    /// Get a clone of the database Arc
    pub fn db_clone(&self) -> Arc<Mutex<Database>> {
        Arc::clone(&self.db)
    }

    pub async fn start_tracking(self: Arc<Self>) {
        // Clean up orphaned in-progress sessions from previous crashes
        // Sessions stuck in (duration_seconds=0, end_time=start_time) for > 15s are orphaned
        {
            let db = self.db.lock().await;
            let deleted = db
                .cleanup_orphaned_sessions((SESSION_FLUSH_INTERVAL as i64) * 3)
                .unwrap_or(0);
            if deleted > 0 {
                tracing::info!(count = deleted, "Cleaned up orphaned in-progress sessions");
            }
        }

        let mut ticker = interval(Duration::from_secs(1));
        let mut limit_check_counter: u32 = 0;

        // Startup diagnostic: test window detection once and log result
        match get_active_window_name() {
            Ok(Some(ref name)) => {
                tracing::info!(window = %name, "Window tracking active - detected current window");
            }
            Ok(None) => {
                tracing::warn!("Window tracking started but no active window detected (desktop/lock screen, or detection may be broken)");
            }
            Err(ref e) => {
                tracing::error!(error = %e, "Window tracking failed on startup - app usage will NOT be recorded");
            }
        }

        loop {
            ticker.tick().await;

            // Retry any buffered failed writes first
            self.retry_pending_writes().await;

            // Track window every second
            if let Err(e) = self.track_window().await {
                tracing::error!(error = %e, "Error tracking window");
            }

            // Check limits every 10 seconds to reduce overhead
            limit_check_counter += 1;
            if limit_check_counter >= 10 {
                limit_check_counter = 0;
                if let Err(e) = self.check_limits_and_notify().await {
                    tracing::error!(error = %e, "Error checking limits");
                }
            }
        }
    }

    /// Finalize the current session (flush duration to DB).
    /// Call this on graceful shutdown to avoid losing the last session's data.
    pub async fn finalize_current_session(&self) {
        let current_session_id = self.current_session_id.lock().await;
        let session_start = self.session_start.lock().await;

        if let (Some(session_id), Some(_start)) = (*current_session_id, *session_start) {
            let now = chrono::Utc::now().timestamp();
            let db = self.db.lock().await;
            if let Err(e) = db.update_session_duration(session_id, now) {
                tracing::error!(
                    error = %e,
                    session_id = session_id,
                    "Failed to finalize session on shutdown"
                );
                // Buffer for retry on next startup (best effort)
                drop(db);
                drop(session_start);
                drop(current_session_id);
                self.buffer_failed_write(PendingWrite::UpdateSession {
                    session_id,
                    end_time: now,
                })
                .await;
            } else {
                tracing::info!(
                    session_id = session_id,
                    "Finalized current session on shutdown"
                );
            }
        }
    }

    /// Buffer a failed write for later retry
    async fn buffer_failed_write(&self, write: PendingWrite) {
        let mut buffer = self.retry_buffer.lock().await;
        if buffer.len() >= MAX_RETRY_BUFFER_SIZE {
            // Drop the oldest entry to make room
            let dropped = buffer.remove(0);
            tracing::warn!(
                dropped = ?dropped,
                "Retry buffer full, dropping oldest pending write"
            );
        }
        tracing::debug!(write = ?write, "Buffering failed DB write for retry");
        buffer.push(write);
    }

    /// Retry all buffered failed writes
    async fn retry_pending_writes(&self) {
        let mut buffer = self.retry_buffer.lock().await;
        if buffer.is_empty() {
            return;
        }

        let writes: Vec<PendingWrite> = buffer.drain(..).collect();
        drop(buffer);

        // Phase 1: retry UpdateSession writes (need &Database)
        let db = self.db.lock().await;
        let mut remaining = Vec::new();

        for write in writes {
            match write {
                PendingWrite::UpdateSession {
                    session_id,
                    end_time,
                } => match db.update_session_duration(session_id, end_time) {
                    Ok(_) => {
                        tracing::info!(session_id = session_id, "Retried session update succeeded");
                    }
                    Err(e) => {
                        tracing::warn!(
                            error = %e,
                            session_id = session_id,
                            "Retry failed for session update"
                        );
                        remaining.push(PendingWrite::UpdateSession {
                            session_id,
                            end_time,
                        });
                    }
                },
                PendingWrite::RecordSession { .. } => {
                    remaining.push(write);
                }
            }
        }

        drop(db);

        // Phase 2: retry RecordSession writes (need &mut Database)
        if !remaining.is_empty() {
            let mut update_sessions = Vec::new();
            let mut db = self.db.lock().await;

            for write in remaining {
                match write {
                    PendingWrite::RecordSession {
                        app_name,
                        duration_seconds,
                    } => {
                        if let Err(e) = db.record_usage_atomic(&app_name, duration_seconds) {
                            tracing::warn!(
                                error = %e,
                                app = %app_name,
                                "Retry failed for atomic session record"
                            );
                            let mut buffer = self.retry_buffer.lock().await;
                            buffer.push(PendingWrite::RecordSession {
                                app_name,
                                duration_seconds,
                            });
                        } else {
                            tracing::info!(app = %app_name, "Retried atomic session record succeeded");
                        }
                    }
                    other => update_sessions.push(other),
                }
            }

            // Re-buffer any UpdateSession writes that still failed
            if !update_sessions.is_empty() {
                let mut buffer = self.retry_buffer.lock().await;
                buffer.extend(update_sessions);
            }
        }
    }

    async fn track_window(&self) -> Result<(), String> {
        let mut window_name = get_active_window_name()?;

        tracing::trace!(
            has_window = window_name.is_some(),
            "track_window: raw window detection result"
        );

        // Check for idle - platform-specific behavior
        let idle_seconds = get_idle_seconds();

        if idle_seconds >= IDLE_THRESHOLD_SECONDS {
            // User is idle, treat as no active window to stop tracking
            tracing::debug!(idle_seconds, "User idle, clearing window_name");
            window_name = None;
        }

        let app_name = match window_name {
            Some(ref name) => {
                let extracted = extract_app_name(name);
                tracing::trace!(
                    extracted = extracted.is_some(),
                    "track_window: extract_app_name result"
                );
                extracted
            }
            None => None,
        };

        let mut current_app = self.current_app.lock().await;
        let mut current_session_id = self.current_session_id.lock().await;
        let mut session_start = self.session_start.lock().await;

        let now = chrono::Utc::now().timestamp();

        // Check if the current app should be blocked
        if let Some(ref app) = app_name {
            if !is_self_app(app) {
                let now = chrono::Utc::now().timestamp();
                let is_blocked = {
                    let mut cache = self.cached_blocked.lock().await;
                    if let Some(&(blocked, checked_at)) = cache.get(app) {
                        if now - checked_at < BLOCKED_CHECK_CACHE_SECONDS {
                            blocked
                        } else {
                            let db = self.db.lock().await;
                            let result = db.is_app_blocked(app).unwrap_or(false);
                            drop(db);
                            cache.insert(app.to_string(), (result, now));
                            result
                        }
                    } else {
                        let db = self.db.lock().await;
                        let result = db.is_app_blocked(app).unwrap_or(false);
                        drop(db);
                        cache.insert(app.to_string(), (result, now));
                        result
                    }
                };

                let focus_blocked = self.focus_manager.should_block_app(app).await;

                if is_blocked || focus_blocked {
                    // Check if app has emergency access
                    if self.emergency_access.has_active_access(app).await {
                        // Allow the app, emergency access is active
                        tracing::debug!(app = %app, "App has emergency access, allowing");
                    } else {
                        // Emit blocked event and send notification
                        // Frontend overlay handles the popup UI
                        self.emit_blocked_event(app).await;
                    }
                }
            }
        }

        // Check if app changed
        if *current_app != app_name {
            // End previous session if exists
            if let (Some(session_id), Some(_)) = (*current_session_id, *session_start) {
                if let Err(e) = self.write_session_duration(session_id, now).await {
                    tracing::error!(error = %e, session_id, "Failed to end session");
                }
            }

            // Reset flush counter on app switch
            *self.flush_counter.lock().await = 0;

            // Start new session if we have an app
            if let Some(ref app) = app_name {
                // Skip tracking our own app
                if !is_self_app(app) {
                    let db = self.db.lock().await;
                    match db.get_or_create_app(app, None) {
                        Ok(app_id) => match db.start_session(app_id, now) {
                            Ok(session_id) => {
                                tracing::info!(app = %app, session_id, "Started tracking app");
                                *current_session_id = Some(session_id);
                                *session_start = Some(now);
                            }
                            Err(e) => {
                                tracing::error!(error = %e, app = %app, "Failed to start session");
                                *current_session_id = None;
                                *session_start = None;
                            }
                        },
                        Err(e) => {
                            tracing::error!(error = %e, app = %app, "Failed to get/create app");
                            *current_session_id = None;
                            *session_start = None;
                        }
                    }
                } else {
                    *current_session_id = None;
                    *session_start = None;
                }
            } else {
                *current_session_id = None;
                *session_start = None;
            }

            *current_app = app_name;
        } else if let Some(session_id) = *current_session_id {
            // Same app - use counter-based flush instead of unreliable modulo on timestamps
            let mut counter = self.flush_counter.lock().await;
            *counter += 1;
            if *counter >= SESSION_FLUSH_INTERVAL {
                *counter = 0;
                if let Err(e) = self.write_session_duration(session_id, now).await {
                    tracing::error!(error = %e, session_id, "Failed to update session duration");
                }
            }
        }

        Ok(())
    }

    /// Write session duration to DB with retry buffering on failure
    async fn write_session_duration(&self, session_id: i64, end_time: i64) -> Result<(), String> {
        let db = self.db.lock().await;
        match db.update_session_duration(session_id, end_time) {
            Ok(()) => {
                *self.last_written_end_time.lock().await = Some(end_time);
                Ok(())
            }
            Err(e) => {
                let err_msg = format!("Failed to update session: {}", e);
                drop(db);
                // Buffer for retry
                self.buffer_failed_write(PendingWrite::UpdateSession {
                    session_id,
                    end_time,
                })
                .await;
                Err(err_msg)
            }
        }
    }

    async fn check_limits_and_notify(&self) -> Result<(), String> {
        // Reset notifications if it's a new day
        self.reset_notifications_if_new_day().await;

        let db = self.db.lock().await;
        let limit_statuses = db
            .get_all_limit_status()
            .map_err(|e| format!("Failed to get limit status: {}", e))?;
        drop(db);

        for (app_name, limit_minutes, used_seconds, _block_when_exceeded) in limit_statuses {
            let limit_seconds = (limit_minutes as i64) * 60;
            if limit_seconds == 0 {
                continue;
            }

            let usage_ratio = used_seconds as f64 / limit_seconds as f64;

            // Check if exceeded (100%)
            if usage_ratio >= EXCEEDED_THRESHOLD {
                self.send_notification_if_not_sent(
                    &app_name,
                    NotificationType::Exceeded,
                    &format!("Time limit exceeded for {}", app_name),
                    &format!(
                        "{} has exceeded its daily limit of {} minutes.",
                        app_name, limit_minutes
                    ),
                )
                .await;
            }
            // Check if approaching (80%)
            else if usage_ratio >= WARNING_THRESHOLD {
                let remaining_minutes = ((limit_seconds - used_seconds) / 60).max(1);
                self.send_notification_if_not_sent(
                    &app_name,
                    NotificationType::Warning,
                    &format!("{} - {} min remaining", app_name, remaining_minutes),
                    &format!("You've used 80% of your daily limit for {}.", app_name),
                )
                .await;
            }
        }

        Ok(())
    }

    async fn reset_notifications_if_new_day(&self) {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let mut last_reset = self.last_reset_date.lock().await;

        if *last_reset != today {
            let mut notifications = self.sent_notifications.lock().await;
            notifications.clear();
            *last_reset = today;
            tracing::info!("Reset notification tracking for new day");
        }
    }

    async fn send_notification_if_not_sent(
        &self,
        app_name: &str,
        notification_type: NotificationType,
        title: &str,
        body: &str,
    ) {
        let key = (app_name.to_string(), notification_type);

        let mut notifications = self.sent_notifications.lock().await;

        if notifications.contains_key(&key) {
            return; // Already sent
        }

        // Send the notification (respecting DND/mute settings)
        if self.send_system_notification(title, body).await {
            notifications.insert(key, true);
            tracing::info!(
                notification_type = ?notification_type,
                app = %app_name,
                "Sent notification"
            );
        }
    }

    /// Send a notification, respecting NotificationManager DND/mute settings if available
    async fn send_system_notification(&self, title: &str, body: &str) -> bool {
        if let Some(ref manager) = self.notification_manager {
            // Use the notification manager which respects DND and mute settings
            match manager.send_notification(title, body, "normal").await {
                Ok(()) => true,
                Err(e) => {
                    tracing::debug!(error = %e, "Notification suppressed or failed");
                    false
                }
            }
        } else {
            // Fallback: direct send (background mode without notification manager)
            crate::notifications::send_notification(title, body)
        }
    }

    /// Emit a blocked-app event and send a notification when a blocked app is detected.
    /// The frontend overlay (LimitReached component) handles the actual popup UI.
    async fn emit_blocked_event(&self, app_name: &str) {
        if let Some(ref handle) = self.app_handle {
            self.popup_manager.show_popup(handle, app_name).await;
        }

        let _ = self
            .send_system_notification(
                &format!("{} limit reached", app_name),
                &format!("Daily time limit exceeded for {}.", app_name),
            )
            .await;
    }

    /// Remove a specific app from the blocked-app cache so the tracker
    /// re-queries the DB on the next tick instead of using stale data.
    pub async fn invalidate_blocked_cache(&self, app_name: &str) {
        self.cached_blocked.lock().await.remove(app_name);
    }

    /// Block/close an app (called when user clicks "Quit App" or emergency access expires).
    /// Tries multiple strategies in increasing aggression order.
    pub fn block_app(&self, app_name: &str) {
        if app_name.is_empty()
            || app_name.len() > 256
            || !app_name
                .chars()
                .all(|c| c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' || c == '.')
            || is_self_app(app_name)
        {
            tracing::warn!(app = %app_name, "Refusing to block app with invalid or self name");
            return;
        }
        let app_lower = app_name.to_lowercase();

        #[cfg(target_os = "linux")]
        {
            // Send notification before blocking (fire-and-forget, don't await)
            let _ = crate::notifications::send_notification(
                &format!("{} blocked", app_name),
                "Daily time limit exceeded. The app will be closed.",
            );

            let _ = block_app_linux(&app_lower, app_name);
        }

        #[cfg(target_os = "windows")]
        {
            // Display names rarely equal the process exe name (e.g. "Visual Studio
            // Code" -> Code.exe), so map known ones before taskkill.
            let exe = WINDOWS_EXE_ALIASES
                .iter()
                .find(|(d, _)| d == &app_lower.as_str())
                .map(|(_, e)| *e)
                .unwrap_or(app_name);

            let exe_clean = if exe.to_lowercase().ends_with(".exe") {
                &exe[..exe.len() - 4]
            } else {
                exe
            };
            if is_self_app(exe_clean) {
                tracing::warn!(exe = %exe_clean, "Refusing to kill Zenith process");
                return;
            }

            let exe_full = format!("{}.exe", exe_clean);

            // /F force kill, /T kill child process tree.
            let _ = Command::new("taskkill")
                .args(["/T", "/F", "/IM", &exe_full])
                .output();
        }
    }
}

/// Helper to check if an app name matches Zenith itself
fn is_self_app(app: &str) -> bool {
    let lower = app.to_lowercase();
    lower == "zenith" || lower == "zenith-dw" || lower == "limit-popup"
}

/// Linux-specific app blocking with multiple strategies.
#[cfg(target_os = "linux")]
fn block_app_linux(app_lower: &str, app_original: &str) -> Result<(), String> {
    let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok()
        || std::env::var("XDG_SESSION_TYPE").unwrap_or_default() == "wayland";

    // 1. Wayland window closing strategies (Hyprland / Sway)
    if is_wayland {
        if let Ok(true) = which_cmd("hyprctl") {
            if let Ok(output) = Command::new("hyprctl").args(["clients", "-j"]).output() {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    if let Ok(clients) = serde_json::from_str::<Vec<serde_json::Value>>(&stdout) {
                        for client in &clients {
                            let class = client.get("class").and_then(|v| v.as_str()).unwrap_or("");
                            let title = client.get("title").and_then(|v| v.as_str()).unwrap_or("");
                            let initial_class = client
                                .get("initialClass")
                                .and_then(|v| v.as_str())
                                .unwrap_or("");
                            if class.to_lowercase().contains(app_lower)
                                || title.to_lowercase().contains(app_lower)
                                || initial_class.to_lowercase().contains(app_lower)
                            {
                                let address = client
                                    .get("address")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or(class);
                                let _ = Command::new("hyprctl")
                                    .args([
                                        "dispatch",
                                        "closewindow",
                                        &format!("address:{}", address),
                                    ])
                                    .output();
                                let _ = Command::new("hyprctl")
                                    .args(["dispatch", "closewindow", class])
                                    .output();
                            }
                        }
                    }
                }
            }
        }

        if let Ok(true) = which_cmd("swaymsg") {
            let _ = Command::new("swaymsg")
                .args([format!("[class=\"(?i){}\"]", app_original).as_str(), "kill"])
                .output();
            let _ = Command::new("swaymsg")
                .args([format!("[title=\"(?i){}\"]", app_original).as_str(), "kill"])
                .output();
        }
    }

    // 2. X11 window closing strategies (wmctrl / xdotool)
    if let Ok(output) = Command::new("wmctrl").args(["-l"]).output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.splitn(4, ' ').collect();
                if parts.len() >= 4 {
                    let window_id = parts[0];
                    let title = parts[3];
                    if title.to_lowercase().contains(app_lower) {
                        let _ = Command::new("wmctrl")
                            .args(["-i", "-c", window_id])
                            .output();
                    }
                }
            }
        }
    }

    if let Ok(output) = Command::new("xdotool")
        .args(["search", "--name", &format!("(?i){}", app_lower)])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for window_id in stdout.trim().lines() {
                if !window_id.is_empty() {
                    let _ = Command::new("xdotool")
                        .args(["windowclose", window_id])
                        .output();
                }
            }
        }
    }

    if let Ok(output) = Command::new("xdotool")
        .args(["search", "--class", &format!("(?i){}", app_lower)])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for window_id in stdout.trim().lines() {
                if !window_id.is_empty() {
                    let _ = Command::new("xdotool")
                        .args(["windowclose", window_id])
                        .output();
                }
            }
        }
    }

    // 3. Process termination candidates
    let mut targets = vec![app_original.to_string(), app_lower.to_string()];

    // Add candidates based on known app mappings
    match app_lower {
        "visual studio code" | "code" => {
            targets.push("code".to_string());
            targets.push("code-oss".to_string());
        }
        "chrome" | "google chrome" | "google-chrome" => {
            targets.push("chrome".to_string());
            targets.push("google-chrome".to_string());
            targets.push("google-chrome-stable".to_string());
        }
        "chromium" => {
            targets.push("chromium".to_string());
            targets.push("chromium-browser".to_string());
        }
        "brave" | "brave browser" | "brave-browser" => {
            targets.push("brave".to_string());
            targets.push("brave-browser".to_string());
        }
        "firefox" | "mozilla firefox" => {
            targets.push("firefox".to_string());
            targets.push("firefox-esr".to_string());
        }
        "microsoft edge" | "edge" => {
            targets.push("msedge".to_string());
            targets.push("microsoft-edge".to_string());
        }
        "zen browser" | "zen" => {
            targets.push("zen-alpha".to_string());
            targets.push("zen".to_string());
        }
        "vscodium" => {
            targets.push("vscodium".to_string());
            targets.push("codium".to_string());
        }
        "sublime text" => {
            targets.push("sublime_text".to_string());
            targets.push("subl".to_string());
        }
        "telegram" => {
            targets.push("telegram-desktop".to_string());
            targets.push("telegram".to_string());
        }
        "discord" => {
            targets.push("discord".to_string());
            targets.push("vesktop".to_string());
            targets.push("webcord".to_string());
        }
        "slack" => {
            targets.push("slack".to_string());
        }
        "spotify" => {
            targets.push("spotify".to_string());
        }
        _ => {}
    }

    if app_lower.contains(' ') {
        targets.push(app_lower.replace(' ', "-"));
        targets.push(app_lower.replace(' ', ""));
        targets.push(app_lower.replace(' ', "_"));
    }

    // De-duplicate targets and remove any that match "zenith"
    targets.retain(|t| {
        let t_lower = t.to_lowercase();
        !t_lower.is_empty() && t_lower != "zenith" && t_lower != "zenith-dw"
    });

    for target in &targets {
        // Try pkill -9 -x (exact process name)
        let _ = Command::new("pkill").args(["-9", "-x", target]).output();

        // Try pkill -9 -f (case insensitive full command line pattern)
        let _ = Command::new("pkill")
            .args(["-9", "-f", &format!("(?i){}", target)])
            .output();

        // Try killall -9
        let _ = Command::new("killall").args(["-9", target]).output();
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn which_cmd(cmd: &str) -> Result<bool, String> {
    std::process::Command::new("which")
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .map_err(|e| format!("Failed to check for {}: {}", cmd, e))
}

/// Get user idle time in seconds, cross-platform.
///
/// - Linux (X11): uses `user-idle` crate (requires libxss)
/// - Linux (Wayland): uses logind DBus IdleHint for idle detection
/// - Windows/macOS: uses `user-idle` crate natively
fn get_idle_seconds() -> u64 {
    #[cfg(target_os = "linux")]
    {
        let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok()
            || std::env::var("XDG_SESSION_TYPE").unwrap_or_default() == "wayland";
        if is_wayland {
            return get_idle_seconds_wayland();
        }
    }

    match user_idle::UserIdle::get_time() {
        Ok(idle) => idle.as_seconds(),
        Err(e) => {
            tracing::trace!("Failed to get idle time: {}", e);
            0
        }
    }
}

/// Wayland idle detection via logind DBus IdleHint.
///
/// Calls `loginctl show-session self -p IdleSinceHint --value` to get the
/// monotonic timestamp (in microseconds) when the session became idle.
/// Falls back to `IdleHint` boolean if the timestamp approach fails.
#[cfg(target_os = "linux")]
fn get_idle_seconds_wayland() -> u64 {
    use std::process::Command;
    use std::time::SystemTime;

    // First try: get IdleSinceHint (microseconds since epoch of idle start)
    if let Ok(output) = Command::new("busctl")
        .args([
            "--user",
            "get-property",
            "org.freedesktop.login1",
            "/org/freedesktop/login1/session/auto",
            "org.freedesktop.login1.Session",
            "IdleSinceHint",
        ])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Output format: "t <microseconds>\n"
            if let Some(value) = stdout.trim().strip_prefix("t ") {
                if let Ok(idle_since_us) = value.parse::<u64>() {
                    if idle_since_us == 0 {
                        // 0 means not idle
                        return 0;
                    }
                    // Convert to seconds since epoch and compare to now
                    if let Ok(now) = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH) {
                        let now_us = now.as_micros() as u64;
                        if now_us > idle_since_us {
                            return (now_us - idle_since_us) / 1_000_000;
                        }
                    }
                }
            }
        }
    }

    // Fallback: just check the boolean IdleHint
    if let Ok(output) = Command::new("busctl")
        .args([
            "--user",
            "get-property",
            "org.freedesktop.login1",
            "/org/freedesktop/login1/session/auto",
            "org.freedesktop.login1.Session",
            "IdleHint",
        ])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Output format: "b true\n" or "b false\n"
            if stdout.contains("true") {
                // We know user is idle but don't know for how long.
                // Return the threshold + 1 to trigger idle detection.
                return IDLE_THRESHOLD_SECONDS + 1;
            }
            return 0;
        }
    }

    // If all methods fail, assume active (conservative - better to over-track than miss data)
    tracing::trace!("Wayland idle detection failed, assuming active");
    0
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use super::*;

    #[test]
    fn windows_exe_alias_resolves_display_names() {
        assert_eq!(
            WINDOWS_EXE_ALIASES
                .iter()
                .find(|(d, _)| d == &"visual studio code")
                .unwrap()
                .1,
            "Code"
        );
        assert_eq!(
            WINDOWS_EXE_ALIASES
                .iter()
                .find(|(d, _)| d == &"google chrome")
                .unwrap()
                .1,
            "chrome"
        );
    }
}
