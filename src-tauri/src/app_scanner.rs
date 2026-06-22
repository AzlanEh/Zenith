use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[cfg(target_os = "linux")]
use std::collections::VecDeque;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub name: String,
    pub exec: Option<String>,
    pub icon: Option<String>,
    pub desktop_file: String,
    pub categories: Vec<String>,
}

/// Resolve an icon name or path to an absolute file path.
/// Returns None if the icon cannot be found.
pub fn resolve_icon_path(icon: &str) -> Option<String> {
    #[cfg(target_os = "linux")]
    {
        resolve_icon_path_linux(icon)
    }

    #[cfg(target_os = "windows")]
    {
        resolve_icon_path_windows(icon)
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = icon;
        None
    }
}

/// Linux: resolve an XDG icon name (e.g. "firefox") or an absolute path to a PNG/SVG file.
#[cfg(target_os = "linux")]
/// Canonicalize a path, resolving any symlinks.
/// Falls back to the original string if canonicalization fails (e.g. broken symlink).
fn canonicalize_path(path: &PathBuf) -> String {
    std::fs::canonicalize(path)
        .unwrap_or_else(|_| path.clone())
        .to_string_lossy()
        .to_string()
}

#[cfg(target_os = "linux")]
fn push_unique_path(paths: &mut Vec<PathBuf>, path: PathBuf) {
    if !paths.iter().any(|p| p == &path) {
        paths.push(path);
    }
}

#[cfg(target_os = "linux")]
fn find_icon_recursive(
    root: &PathBuf,
    icon_stem: &str,
    extensions: &[&str],
    max_depth: usize,
) -> Option<String> {
    if !root.exists() || !root.is_dir() {
        return None;
    }

    let mut queue: VecDeque<(PathBuf, usize)> = VecDeque::new();
    queue.push_back((root.clone(), 0));

    while let Some((dir, depth)) = queue.pop_front() {
        if depth > max_depth {
            continue;
        }

        let Ok(entries) = fs::read_dir(&dir) else {
            continue;
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if depth < max_depth {
                    queue.push_back((path, depth + 1));
                }
                continue;
            }

            let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
                continue;
            };
            if stem != icon_stem {
                continue;
            }

            let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
                continue;
            };
            if extensions
                .iter()
                .any(|known| known.eq_ignore_ascii_case(ext))
            {
                return Some(canonicalize_path(&path));
            }
        }
    }

    None
}

#[cfg(target_os = "linux")]
fn resolve_icon_path_linux(icon: &str) -> Option<String> {
    let icon = icon.trim().trim_matches('"');
    let path = PathBuf::from(icon);

    // If the icon is already an absolute path and the file exists, return the
    // canonicalized path (resolves any symlinks so the Tauri asset scope check passes).
    if path.is_absolute() && path.exists() {
        return Some(canonicalize_path(&path));
    }

    // Icon is a theme name — search standard XDG icon directories.
    // Preferred sizes (largest first so we get the best quality).
    let preferred_sizes = [
        "256x256", "128x128", "64x64", "48x48", "scalable", "32x32", "24x24", "22x22", "16x16",
    ];
    let extensions = ["png", "svg", "svgz", "xpm"];

    // Build search paths: user overrides first, then system paths.
    let mut search_dirs: Vec<PathBuf> = Vec::new();

    if let Some(home) = dirs::home_dir() {
        let user_icons = home.join(".local/share/icons");
        let user_dot_icons = home.join(".icons");
        search_dirs.push(user_icons.clone());
        search_dirs.push(user_dot_icons.clone());
        // Some apps (e.g. AppImages, manually installed) store their icons here
        search_dirs.push(home.join(".local/share/applications/icons"));

        // Include user theme directories dynamically (e.g. Tela, Yaru, Colloid)
        for root in [&user_icons, &user_dot_icons] {
            if root.exists() {
                if let Ok(entries) = fs::read_dir(root) {
                    for entry in entries.flatten() {
                        let dir = entry.path();
                        if dir.is_dir() {
                            push_unique_path(&mut search_dirs, dir);
                        }
                    }
                }
            }
        }
    }

    // Pixmaps (many apps install icons here directly by name)
    search_dirs.push(PathBuf::from("/usr/share/pixmaps"));

    // Common icon theme bases
    let icon_base_dirs = [
        "/usr/share/icons/hicolor",
        "/usr/share/icons/Papirus",
        "/usr/share/icons/breeze",
        "/usr/share/icons/gnome",
        "/usr/share/icons/Adwaita",
        "/usr/share/icons/oxygen",
        "/usr/share/icons/elementary",
        "/usr/share/icons/Numix",
    ];

    // Include all system icon themes dynamically so icons from non-hardcoded themes resolve.
    let mut dynamic_icon_bases: Vec<PathBuf> = icon_base_dirs.iter().map(PathBuf::from).collect();
    let system_icons_root = PathBuf::from("/usr/share/icons");
    if system_icons_root.exists() {
        if let Ok(entries) = fs::read_dir(&system_icons_root) {
            for entry in entries.flatten() {
                let dir = entry.path();
                if dir.is_dir() {
                    push_unique_path(&mut dynamic_icon_bases, dir);
                }
            }
        }
    }

    // If icon already contains an extension, try direct lookups first.
    let has_known_ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|ext| {
            extensions
                .iter()
                .any(|known| known.eq_ignore_ascii_case(ext))
        })
        .unwrap_or(false);

    if has_known_ext {
        // Relative icon paths appear in some desktop files (e.g. "hicolor/128x128/apps/foo.png")
        for base in dynamic_icon_bases.iter().chain(search_dirs.iter()) {
            let candidate = base.join(&path);
            if candidate.exists() {
                return Some(canonicalize_path(&candidate));
            }
        }

        // Flat icon filename in common dirs
        for dir in &search_dirs {
            let candidate = dir.join(icon);
            if candidate.exists() {
                return Some(canonicalize_path(&candidate));
            }
        }
    }

    let icon_stem = if has_known_ext {
        path.file_stem().and_then(|s| s.to_str()).unwrap_or(icon)
    } else {
        icon
    };

    // For icon name resolution, first try hicolor theme (the fallback theme per FreeDesktop spec)
    for size in &preferred_sizes {
        for base in &dynamic_icon_bases {
            for ext in &extensions {
                let candidate = base
                    .join(size)
                    .join("apps")
                    .join(format!("{}.{}", icon_stem, ext));
                if candidate.exists() {
                    return Some(canonicalize_path(&candidate));
                }
            }
        }
    }

    // Also try pixmaps directory directly (flat layout, no size subdirs)
    for ext in &extensions {
        let candidate = PathBuf::from("/usr/share/pixmaps").join(format!("{}.{}", icon_stem, ext));
        if candidate.exists() {
            return Some(canonicalize_path(&candidate));
        }
    }

    // Try user icon dirs flat
    for dir in &search_dirs {
        for ext in &extensions {
            let candidate = dir.join(format!("{}.{}", icon_stem, ext));
            if candidate.exists() {
                return Some(canonicalize_path(&candidate));
            }
        }
    }

    // Try Flatpak exports icon paths
    let flatpak_icon_dirs = ["/var/lib/flatpak/exports/share/icons/hicolor"];
    for size in &preferred_sizes {
        for base in &flatpak_icon_dirs {
            for ext in &extensions {
                let candidate = PathBuf::from(base)
                    .join(size)
                    .join("apps")
                    .join(format!("{}.{}", icon_stem, ext));
                if candidate.exists() {
                    return Some(canonicalize_path(&candidate));
                }
            }
        }
    }

    // User flatpak icons
    if let Some(home) = dirs::home_dir() {
        let user_flatpak_base = home.join(".local/share/flatpak/exports/share/icons/hicolor");
        for size in &preferred_sizes {
            for ext in &extensions {
                let candidate = user_flatpak_base
                    .join(size)
                    .join("apps")
                    .join(format!("{}.{}", icon_stem, ext));
                if candidate.exists() {
                    return Some(canonicalize_path(&candidate));
                }
            }
        }
    }

    // Flatpak app install directories (icons bundled inside each app)
    let mut flatpak_app_roots = vec![PathBuf::from("/var/lib/flatpak/app")];
    if let Some(home) = dirs::home_dir() {
        flatpak_app_roots.push(home.join(".local/share/flatpak/app"));
    }

    for root in &flatpak_app_roots {
        let app_hicolor = root
            .join(icon_stem)
            .join("current/active/files/share/icons/hicolor");
        for size in &preferred_sizes {
            for ext in &extensions {
                let candidate = app_hicolor
                    .join(size)
                    .join("apps")
                    .join(format!("{}.{}", icon_stem, ext));
                if candidate.exists() {
                    return Some(canonicalize_path(&candidate));
                }
            }
        }
    }

    // Last-resort fallback for odd app icon locations
    let mut recursive_roots = vec![
        PathBuf::from("/usr/share/icons"),
        PathBuf::from("/usr/share/pixmaps"),
        PathBuf::from("/usr/share"),
    ];
    if let Some(home) = dirs::home_dir() {
        recursive_roots.push(home.join(".local/share/icons"));
        recursive_roots.push(home.join(".icons"));
        recursive_roots.push(home.join(".local/share/flatpak/app"));
    }

    for root in &recursive_roots {
        if let Some(found) = find_icon_recursive(root, icon_stem, &extensions, 6) {
            return Some(found);
        }
    }

    None
}

/// Windows: resolve an icon path from the registry (usually an .exe path, optionally with comma-index).
/// Returns the .exe/.ico path as-is so the frontend can display it via asset protocol.
#[cfg(target_os = "windows")]
fn resolve_icon_path_windows(icon: &str) -> Option<String> {
    // Registry DisplayIcon values often look like "C:\path\to\app.exe,0" or "C:\path\to\app.ico"
    // Strip the trailing comma+index if present.
    let clean = if let Some(comma_pos) = icon.rfind(',') {
        let before_comma = &icon[..comma_pos];
        // Only strip if what follows the comma looks like an integer index
        let after_comma = &icon[comma_pos + 1..];
        if after_comma.trim().parse::<i32>().is_ok() {
            before_comma.trim()
        } else {
            icon.trim()
        }
    } else {
        icon.trim()
    };

    // Remove surrounding quotes if present
    let clean = clean.trim_matches('"');

    let path = PathBuf::from(clean);
    if path.exists() {
        Some(path.to_string_lossy().to_string())
    } else {
        None
    }
}

/// Cached installed apps — scanned once, served forever.
static INSTALLED_APPS_CACHE: Lazy<Mutex<Option<Vec<InstalledApp>>>> =
    Lazy::new(|| Mutex::new(None));

/// Get all installed applications (cross-platform), cached after first call.
pub fn get_installed_apps() -> Vec<InstalledApp> {
    let mut cache = INSTALLED_APPS_CACHE.lock().unwrap();
    if let Some(ref cached) = *cache {
        return cached.clone();
    }
    let apps = scan_installed_apps();
    *cache = Some(apps.clone());
    apps
}

fn scan_installed_apps() -> Vec<InstalledApp> {
    #[cfg(target_os = "linux")]
    {
        get_installed_apps_linux()
    }

    #[cfg(target_os = "windows")]
    {
        get_installed_apps_windows()
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        Vec::new()
    }
}

/// Get all installed applications from .desktop files (Linux)
#[cfg(target_os = "linux")]
fn get_installed_apps_linux() -> Vec<InstalledApp> {
    let mut apps = Vec::new();

    // Standard locations for .desktop files
    let desktop_dirs = vec![
        PathBuf::from("/usr/share/applications"),
        PathBuf::from("/usr/local/share/applications"),
        dirs::home_dir()
            .map(|h| h.join(".local/share/applications"))
            .unwrap_or_default(),
        // Flatpak apps
        PathBuf::from("/var/lib/flatpak/exports/share/applications"),
        dirs::home_dir()
            .map(|h| h.join(".local/share/flatpak/exports/share/applications"))
            .unwrap_or_default(),
        // Snap apps
        PathBuf::from("/var/lib/snapd/desktop/applications"),
    ];

    for dir in desktop_dirs {
        if dir.exists() && dir.is_dir() {
            if let Ok(entries) = fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().is_some_and(|ext| ext == "desktop") {
                        if let Some(app) = parse_desktop_file(&path) {
                            if let Some(existing) = apps.iter_mut().find(|a: &&mut InstalledApp| {
                                a.name.eq_ignore_ascii_case(&app.name)
                            }) {
                                let existing_score = score_installed_app(existing);
                                let incoming_score = score_installed_app(&app);

                                if incoming_score > existing_score {
                                    *existing = app;
                                } else {
                                    if existing.icon.is_none() && app.icon.is_some() {
                                        existing.icon = app.icon;
                                    }
                                    if existing.exec.is_none() && app.exec.is_some() {
                                        existing.exec = app.exec;
                                    }
                                    if existing.categories.is_empty() && !app.categories.is_empty()
                                    {
                                        existing.categories = app.categories;
                                    }
                                }
                            } else {
                                apps.push(app);
                            }
                        }
                    }
                }
            }
        }
    }

    // Sort by name
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

/// Get installed applications on Windows from Start Menu shortcuts and registry
#[cfg(target_os = "windows")]
fn get_installed_apps_windows() -> Vec<InstalledApp> {
    let mut apps = Vec::new();

    // Scan Start Menu shortcuts (.lnk files)
    let start_menu_dirs: Vec<PathBuf> = vec![
        // Common (all users) Start Menu
        std::env::var("ProgramData")
            .map(|p| PathBuf::from(p).join("Microsoft\\Windows\\Start Menu\\Programs"))
            .unwrap_or_default(),
        // Current user Start Menu
        dirs::data_dir()
            .map(|p| {
                p.parent()
                    .unwrap_or(&p)
                    .join("Roaming\\Microsoft\\Windows\\Start Menu\\Programs")
            })
            .unwrap_or_default(),
    ];

    for dir in start_menu_dirs {
        if dir.exists() && dir.is_dir() {
            scan_start_menu_dir(&dir, &mut apps);
        }
    }

    // Scan registry for installed programs
    scan_registry_apps(&mut apps);

    // Sort by name
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // Deduplicate by name
    apps.dedup_by(|a, b| a.name.to_lowercase() == b.name.to_lowercase());

    apps
}

/// Recursively scan Start Menu directories for .lnk shortcut files (Windows)
#[cfg(target_os = "windows")]
fn scan_start_menu_dir(dir: &PathBuf, apps: &mut Vec<InstalledApp>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // Recurse into subdirectories (program groups)
                scan_start_menu_dir(&path, apps);
            } else if path.extension().map_or(false, |ext| ext == "lnk") {
                // Extract name from .lnk filename (without extension)
                if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                    let name = name.to_string();

                    // Skip common uninstallers and system utilities
                    let skip_patterns = [
                        "uninstall",
                        "readme",
                        "help",
                        "license",
                        "changelog",
                        "release notes",
                        "website",
                        "documentation",
                    ];
                    if skip_patterns
                        .iter()
                        .any(|p| name.to_lowercase().contains(p))
                    {
                        continue;
                    }

                    if !apps.iter().any(|a| a.name == name) {
                        apps.push(InstalledApp {
                            name,
                            exec: Some(path.to_string_lossy().to_string()),
                            icon: None,
                            desktop_file: path
                                .file_name()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string(),
                            categories: Vec::new(),
                        });
                    }
                }
            }
        }
    }
}

/// Scan Windows registry for installed programs
#[cfg(target_os = "windows")]
fn scan_registry_apps(apps: &mut Vec<InstalledApp>) {
    use winreg::enums::*;
    use winreg::RegKey;

    let registry_paths = [
        (
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        ),
        (
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        ),
        (
            HKEY_CURRENT_USER,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        ),
    ];

    for (hkey, path) in &registry_paths {
        let Ok(key) = RegKey::predef(*hkey).open_subkey_with_flags(path, KEY_READ) else {
            continue;
        };

        for name in key.enum_keys().flatten() {
            let Ok(subkey) = key.open_subkey_with_flags(&name, KEY_READ) else {
                continue;
            };

            // Skip system components and entries without display names
            let is_system: bool = subkey.get_value("SystemComponent").unwrap_or(0u32) == 1;
            if is_system {
                continue;
            }

            let display_name: String = match subkey.get_value("DisplayName") {
                Ok(name) => name,
                Err(_) => continue,
            };

            // Skip if name is empty or already exists
            if display_name.is_empty() || apps.iter().any(|a| a.name == display_name) {
                continue;
            }

            let install_location: Option<String> = subkey.get_value("InstallLocation").ok();
            let display_icon: Option<String> = subkey.get_value("DisplayIcon").ok();

            apps.push(InstalledApp {
                name: display_name,
                exec: install_location,
                icon: display_icon,
                desktop_file: name,
                categories: Vec::new(),
            });
        }
    }
}

/// Parse a .desktop file and extract app information (Linux only)
#[cfg(target_os = "linux")]
fn parse_desktop_file(path: &PathBuf) -> Option<InstalledApp> {
    let content = fs::read_to_string(path).ok()?;

    let mut name: Option<String> = None;
    let mut exec: Option<String> = None;
    let mut icon: Option<String> = None;
    let mut categories: Vec<String> = Vec::new();
    let mut no_display = false;
    let mut hidden = false;
    let mut app_type: Option<String> = None;

    let mut in_desktop_entry = false;

    for line in content.lines() {
        let line = line.trim();

        // Track which section we're in
        if line.starts_with('[') {
            in_desktop_entry = line == "[Desktop Entry]";
            continue;
        }

        if !in_desktop_entry {
            continue;
        }

        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim();
            let value = value.trim();

            match key {
                "Name" if name.is_none() => name = Some(value.to_string()),
                "Exec" => exec = Some(clean_exec(value)),
                "Icon" => icon = Some(value.to_string()),
                "Categories" => {
                    categories = value
                        .split(';')
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string())
                        .collect();
                }
                "NoDisplay" => no_display = value.eq_ignore_ascii_case("true"),
                "Hidden" => hidden = value.eq_ignore_ascii_case("true"),
                "Type" => app_type = Some(value.to_string()),
                _ => {}
            }
        }
    }

    // Skip hidden apps, non-application types, or apps without names
    if no_display || hidden {
        return None;
    }

    if app_type.as_deref() != Some("Application") {
        return None;
    }

    let name = name?;

    // Skip some system utilities that aren't useful to track
    let skip_names = [
        "Desktop",
        "Files",
        "Software",
        "Settings",
        "Terminal",
        "Archive Manager",
        "Disk Usage",
        "System Monitor",
    ];

    if skip_names.iter().any(|s| name.eq_ignore_ascii_case(s)) {
        return None;
    }

    Some(InstalledApp {
        name,
        exec,
        icon,
        desktop_file: path.file_name()?.to_string_lossy().to_string(),
        categories,
    })
}

/// Clean the Exec field by removing field codes like %u, %U, %f, %F, etc. (Linux only)
#[cfg(target_os = "linux")]
fn clean_exec(exec: &str) -> String {
    let mut result = exec.to_string();
    // Remove common field codes
    for code in &[
        "%u", "%U", "%f", "%F", "%i", "%c", "%k", "%d", "%D", "%n", "%N", "%v", "%m",
    ] {
        result = result.replace(code, "");
    }
    result.trim().to_string()
}

#[cfg(target_os = "linux")]
fn score_installed_app(app: &InstalledApp) -> usize {
    let mut score = 0;
    if app.icon.as_ref().is_some_and(|s| !s.trim().is_empty()) {
        score += 4;
    }
    if app.exec.as_ref().is_some_and(|s| !s.trim().is_empty()) {
        score += 2;
    }
    if !app.categories.is_empty() {
        score += 1;
    }
    if app
        .desktop_file
        .to_lowercase()
        .contains(&app.name.to_lowercase().replace(' ', ""))
    {
        score += 1;
    }
    score
}

/// Map app categories from .desktop to our simplified categories
#[allow(dead_code)]
pub fn map_category(desktop_categories: &[String]) -> Option<String> {
    for cat in desktop_categories {
        let cat_lower = cat.to_lowercase();

        // Development
        if cat_lower.contains("development")
            || cat_lower.contains("ide")
            || cat_lower.contains("texteditor")
        {
            return Some("Development".to_string());
        }

        // Communication
        if cat_lower.contains("email")
            || cat_lower.contains("instantmessaging")
            || cat_lower.contains("chat")
            || cat_lower.contains("telephony")
        {
            return Some("Communication".to_string());
        }

        // Entertainment/Media
        if cat_lower.contains("video")
            || cat_lower.contains("audio")
            || cat_lower.contains("music")
            || cat_lower.contains("player")
        {
            return Some("Entertainment".to_string());
        }

        // Gaming
        if cat_lower.contains("game") {
            return Some("Gaming".to_string());
        }

        // Graphics
        if cat_lower.contains("graphics") || cat_lower.contains("photography") {
            return Some("Productivity".to_string());
        }

        // Office
        if cat_lower.contains("office")
            || cat_lower.contains("wordprocessor")
            || cat_lower.contains("spreadsheet")
            || cat_lower.contains("presentation")
        {
            return Some("Productivity".to_string());
        }

        // Education
        if cat_lower.contains("education") || cat_lower.contains("science") {
            return Some("Education".to_string());
        }

        // Network/Web
        if cat_lower.contains("webbrowser") || cat_lower.contains("network") {
            return Some("Productivity".to_string());
        }

        // Social
        if cat_lower.contains("social") {
            return Some("Social Media".to_string());
        }

        // Utilities
        if cat_lower.contains("utility") || cat_lower.contains("system") {
            return Some("Utilities".to_string());
        }
    }

    None
}
