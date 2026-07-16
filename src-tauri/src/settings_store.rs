use crate::break_reminder::BreakSettings;
use crate::focus_mode::FocusSettings;
use crate::notification_settings::NotificationSettings;
use std::collections::HashMap;
use std::io;
use std::path::PathBuf;
use std::sync::Mutex;

static MEMORY_STORE: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

fn is_test_mode() -> bool {
    cfg!(test)
}

fn read_json<T: serde::de::DeserializeOwned>(file_name: &str) -> io::Result<T> {
    if is_test_mode() {
        let store = MEMORY_STORE.lock().unwrap();
        let content = store
            .as_ref()
            .and_then(|m| m.get(file_name))
            .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "test mode"))?
            .clone();
        serde_json::from_str(&content).map_err(|e| io::Error::other(format!("parse settings: {e}")))
    } else {
        use std::fs;
        let path = settings_dir().join(file_name);
        let content = fs::read_to_string(path)?;
        serde_json::from_str(&content).map_err(|e| io::Error::other(format!("parse settings: {e}")))
    }
}

fn write_json<T: serde::Serialize>(file_name: &str, value: &T) -> io::Result<()> {
    let content = serde_json::to_string_pretty(value)
        .map_err(|e| io::Error::other(format!("serialize settings: {e}")))?;

    if is_test_mode() {
        let mut store = MEMORY_STORE.lock().unwrap();
        store
            .get_or_insert_with(HashMap::new)
            .insert(file_name.to_string(), content);
        Ok(())
    } else {
        use std::fs;
        let dir = settings_dir();
        let path = dir.join(file_name);
        fs::create_dir_all(&dir)?;
        fs::write(path, content)
    }
}

const APP_DIR: &str = "zenith";
const SETTINGS_DIR: &str = "settings";
const FOCUS_SETTINGS_FILE: &str = "focus_settings.json";
const BREAK_SETTINGS_FILE: &str = "break_settings.json";
const NOTIFICATION_SETTINGS_FILE: &str = "notification_settings.json";

fn settings_dir() -> std::path::PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(APP_DIR)
        .join(SETTINGS_DIR)
}

pub fn clear_all_settings_files() -> io::Result<()> {
    if is_test_mode() {
        let mut store = MEMORY_STORE.lock().unwrap();
        *store = None;
        Ok(())
    } else {
        use std::fs;
        let dir = settings_dir();
        for file_name in [
            FOCUS_SETTINGS_FILE,
            BREAK_SETTINGS_FILE,
            NOTIFICATION_SETTINGS_FILE,
        ] {
            let path = dir.join(file_name);
            match fs::remove_file(&path) {
                Ok(_) => {}
                Err(e) if e.kind() == io::ErrorKind::NotFound => {}
                Err(e) => return Err(e),
            }
        }
        Ok(())
    }
}

pub fn save_focus_settings(settings: &FocusSettings) -> io::Result<()> {
    write_json(FOCUS_SETTINGS_FILE, settings)
}

pub fn load_focus_settings() -> io::Result<FocusSettings> {
    read_json(FOCUS_SETTINGS_FILE)
}

pub fn save_break_settings(settings: &BreakSettings) -> io::Result<()> {
    write_json(BREAK_SETTINGS_FILE, settings)
}

pub fn load_break_settings() -> io::Result<BreakSettings> {
    read_json(BREAK_SETTINGS_FILE)
}

pub fn save_notification_settings(settings: &NotificationSettings) -> io::Result<()> {
    write_json(NOTIFICATION_SETTINGS_FILE, settings)
}

pub fn load_notification_settings() -> io::Result<NotificationSettings> {
    read_json(NOTIFICATION_SETTINGS_FILE)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_testmode_load_returns_not_found() {
        let err = load_focus_settings().expect_err("test mode should not read disk");
        assert_eq!(err.kind(), io::ErrorKind::NotFound);
    }

    #[test]
    fn test_testmode_save_roundtrip() {
        let settings = FocusSettings::default();
        save_focus_settings(&settings).unwrap();
        let loaded = load_focus_settings().unwrap();
        assert_eq!(
            loaded.default_duration_minutes,
            settings.default_duration_minutes
        );

        let break_settings = BreakSettings::default();
        save_break_settings(&break_settings).unwrap();
        let loaded_break = load_break_settings().unwrap();
        assert_eq!(loaded_break.enabled, break_settings.enabled);
    }

    #[test]
    fn test_clear_all_settings() {
        save_focus_settings(&FocusSettings::default()).unwrap();
        clear_all_settings_files().unwrap();
        let err = load_focus_settings().expect_err("should be gone after clear");
        assert_eq!(err.kind(), io::ErrorKind::NotFound);
    }
}
