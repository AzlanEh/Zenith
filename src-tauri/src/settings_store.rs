use crate::break_reminder::BreakSettings;
use crate::focus_mode::FocusSettings;
use crate::notification_settings::NotificationSettings;
use std::io;

#[cfg(not(test))]
use std::fs;
#[cfg(not(test))]
use std::path::PathBuf;

#[cfg(not(test))]
const APP_DIR: &str = "wellbeing";
#[cfg(not(test))]
const SETTINGS_DIR: &str = "settings";
#[cfg(not(test))]
const FOCUS_SETTINGS_FILE: &str = "focus_settings.json";
#[cfg(not(test))]
const BREAK_SETTINGS_FILE: &str = "break_settings.json";
#[cfg(not(test))]
const NOTIFICATION_SETTINGS_FILE: &str = "notification_settings.json";

#[cfg(not(test))]
fn settings_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(APP_DIR)
        .join(SETTINGS_DIR)
}

#[cfg(test)]
pub fn clear_all_settings_files() -> io::Result<()> {
    Ok(())
}

#[cfg(not(test))]
pub fn clear_all_settings_files() -> io::Result<()> {
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

#[cfg(not(test))]
fn write_json<T: serde::Serialize>(file_name: &str, value: &T) -> io::Result<()> {
    let dir = settings_dir();
    fs::create_dir_all(&dir)?;
    let path = dir.join(file_name);
    let content = serde_json::to_string_pretty(value)
        .map_err(|e| io::Error::other(format!("serialize settings: {e}")))?;
    fs::write(path, content)
}

#[cfg(not(test))]
fn read_json<T: serde::de::DeserializeOwned>(file_name: &str) -> io::Result<T> {
    let path = settings_dir().join(file_name);
    let content = fs::read_to_string(path)?;
    serde_json::from_str(&content).map_err(|e| io::Error::other(format!("parse settings: {e}")))
}

#[cfg(test)]
pub fn save_focus_settings(_settings: &FocusSettings) -> io::Result<()> {
    Ok(())
}

#[cfg(not(test))]
pub fn save_focus_settings(settings: &FocusSettings) -> io::Result<()> {
    write_json(FOCUS_SETTINGS_FILE, settings)
}

#[cfg(test)]
pub fn load_focus_settings() -> io::Result<FocusSettings> {
    Err(io::Error::new(io::ErrorKind::NotFound, "test mode"))
}

#[cfg(not(test))]
pub fn load_focus_settings() -> io::Result<FocusSettings> {
    read_json(FOCUS_SETTINGS_FILE)
}

#[cfg(test)]
pub fn save_break_settings(_settings: &BreakSettings) -> io::Result<()> {
    Ok(())
}

#[cfg(not(test))]
pub fn save_break_settings(settings: &BreakSettings) -> io::Result<()> {
    write_json(BREAK_SETTINGS_FILE, settings)
}

#[cfg(test)]
pub fn load_break_settings() -> io::Result<BreakSettings> {
    Err(io::Error::new(io::ErrorKind::NotFound, "test mode"))
}

#[cfg(not(test))]
pub fn load_break_settings() -> io::Result<BreakSettings> {
    read_json(BREAK_SETTINGS_FILE)
}

#[cfg(test)]
pub fn save_notification_settings(_settings: &NotificationSettings) -> io::Result<()> {
    Ok(())
}

#[cfg(not(test))]
pub fn save_notification_settings(settings: &NotificationSettings) -> io::Result<()> {
    write_json(NOTIFICATION_SETTINGS_FILE, settings)
}

#[cfg(test)]
pub fn load_notification_settings() -> io::Result<NotificationSettings> {
    Err(io::Error::new(io::ErrorKind::NotFound, "test mode"))
}

#[cfg(not(test))]
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
    fn test_testmode_save_is_noop_success() {
        assert!(save_focus_settings(&FocusSettings::default()).is_ok());
        assert!(save_break_settings(&BreakSettings::default()).is_ok());
        assert!(save_notification_settings(&NotificationSettings::default()).is_ok());
    }
}
