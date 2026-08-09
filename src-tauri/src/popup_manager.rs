use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::Mutex;

const POPUP_COOLDOWN_SECONDS: i64 = 5;
pub const POPUP_WINDOW_LABEL: &str = "limit-popup";

pub struct PopupManager {
    /// The app name currently shown in the popup (None if no popup is open)
    active_popup_app: Arc<Mutex<Option<String>>>,
    /// Cooldown tracker: app_name -> last popup show timestamp
    cooldown_map: Arc<Mutex<HashMap<String, i64>>>,
}

impl PopupManager {
    pub fn new() -> Self {
        Self {
            active_popup_app: Arc::new(Mutex::new(None)),
            cooldown_map: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn show_popup(&self, handle: &AppHandle, app_name: &str) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        let mut active = self.active_popup_app.lock().await;
        if let Some(ref current_app) = *active {
            if current_app == app_name {
                // Popup already active for this app
                if let Some(window) = handle.get_webview_window(POPUP_WINDOW_LABEL) {
                    let _ = window.set_focus();
                }
                return;
            }
        }

        let mut cooldowns = self.cooldown_map.lock().await;
        if let Some(&last_shown) = cooldowns.get(app_name) {
            if now - last_shown < POPUP_COOLDOWN_SECONDS {
                tracing::debug!(app_name, "Popup in cooldown, skipping");
                return;
            }
        }

        // If a window already exists, focus it
        if let Some(window) = handle.get_webview_window(POPUP_WINDOW_LABEL) {
            let _ = window.set_focus();
            *active = Some(app_name.to_string());
            cooldowns.insert(app_name.to_string(), now);
            return;
        }

        let encoded_app = urlencoding::encode(app_name);
        let url: WebviewUrl = WebviewUrl::App(format!("/limit-popup?app={}", encoded_app).into());

        match WebviewWindowBuilder::new(handle, POPUP_WINDOW_LABEL, url)
            .title("App Limit Reached")
            .inner_size(420.0, 380.0)
            .resizable(false)
            .decorations(false)
            .always_on_top(true)
            .center()
            .focused(true)
            .build()
        {
            Ok(_) => {
                tracing::info!(app_name, "Created limit popup window");
                *active = Some(app_name.to_string());
                cooldowns.insert(app_name.to_string(), now);
            }
            Err(e) => {
                tracing::error!(error = %e, app_name, "Failed to create limit popup window");
            }
        }
    }

    pub async fn close_popup(&self, handle: &AppHandle) {
        if let Some(window) = handle.get_webview_window(POPUP_WINDOW_LABEL) {
            if let Err(e) = window.close() {
                tracing::error!(error = %e, "Failed to close popup window");
            } else {
                tracing::info!("Closed limit popup window");
            }
        }
        let mut active = self.active_popup_app.lock().await;
        *active = None;
    }
}
