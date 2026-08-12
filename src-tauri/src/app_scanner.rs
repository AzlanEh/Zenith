use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{LazyLock, Mutex};

#[cfg(target_os = "linux")]
use std::collections::VecDeque;

#[cfg(target_os = "windows")]
use std::time::Instant;
#[cfg(target_os = "windows")]
use windows_sys::Win32::Graphics::Gdi::HBITMAP;
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::HICON;

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
    let s = std::fs::canonicalize(path)
        .unwrap_or_else(|_| path.clone())
        .to_string_lossy()
        .to_string();
    #[cfg(target_os = "windows")]
    {
        if let Some(stripped) = s.strip_prefix(r"\\?\UNC\") {
            return format!(r"\\{}", stripped);
        }
        if let Some(stripped) = s.strip_prefix(r"\\?\") {
            return stripped.to_string();
        }
    }
    s
}

#[cfg(target_os = "linux")]
fn push_unique_path(paths: &mut Vec<PathBuf>, path: PathBuf) {
    if !paths.iter().any(|p| p == &path) {
        paths.push(path);
    }
}

#[cfg(target_os = "linux")]
fn find_icon_recursive(
    root: &Path,
    icon_stem: &str,
    extensions: &[&str],
    max_depth: usize,
) -> Option<String> {
    if !root.exists() || !root.is_dir() {
        return None;
    }

    let mut queue: VecDeque<(PathBuf, usize)> = VecDeque::new();
    queue.push_back((root.to_path_buf(), 0));

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
    // Strip the trailing comma+index if present, trimming quotes appropriately.
    let raw = icon.trim().trim_matches('"');
    let clean = if let Some(comma_pos) = raw.rfind(',') {
        let before_comma = raw[..comma_pos].trim().trim_matches('"');
        let after_comma = &raw[comma_pos + 1..];
        if after_comma.trim().parse::<i32>().is_ok() {
            before_comma
        } else {
            raw
        }
    } else {
        raw
    };

    let path = PathBuf::from(clean);
    if !path.exists() {
        return None;
    }

    // An .exe can't be displayed by <img>. Extract its icon to a cached .ico
    // so the asset protocol can serve it. Cache keyed by the exe path.
    if path
        .extension()
        .is_some_and(|e| e.eq_ignore_ascii_case("exe"))
    {
        return extract_exe_icon(&path);
    }

    Some(path.to_string_lossy().to_string())
}

/// Extract the associated icon from an .exe into a cached .ico file using the
/// native Windows API (ExtractIconEx -> GetIconInfo -> GetDIBits). Returns the
/// .ico path, cached under %LOCALAPPDATA%\zenith\icons so extraction happens
/// once per exe.
#[cfg(target_os = "windows")]
fn extract_exe_icon(exe_path: &Path) -> Option<String> {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use windows_sys::Win32::UI::Shell::ExtractIconExW;
    use windows_sys::Win32::UI::WindowsAndMessaging::{DestroyIcon, HICON};

    let cache_dir = dirs::data_local_dir()
        .map(|d| d.join("zenith").join("icons"))
        .or_else(|| {
            std::env::var("LOCALAPPDATA")
                .ok()
                .map(|d| PathBuf::from(d).join("zenith").join("icons"))
        })?;
    fs::create_dir_all(&cache_dir).ok()?;

    let mut hasher = DefaultHasher::new();
    exe_path.to_string_lossy().hash(&mut hasher);
    let ico_path = cache_dir.join(format!("{}.ico", hasher.finish()));

    if ico_path.exists() {
        return Some(ico_path.to_string_lossy().to_string());
    }

    // Extract the large icon (index 0). Falls back to the small icon when only
    // a small one exists (rare).
    let wide: Vec<u16> = exe_path
        .to_string_lossy()
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let mut large: HICON = std::ptr::null_mut();
    let mut small: HICON = std::ptr::null_mut();
    let extracted = unsafe { ExtractIconExW(wide.as_ptr(), 0, &mut large, &mut small, 1) };
    if extracted == 0 {
        return None;
    }
    let chosen = if !large.is_null() { large } else { small };
    let spare = if !large.is_null() && !small.is_null() {
        small
    } else {
        std::ptr::null_mut()
    };
    if chosen.is_null() {
        if !spare.is_null() {
            unsafe { DestroyIcon(spare) };
        }
        return None;
    }

    let written = unsafe { icon_to_ico(chosen, &ico_path) };

    if !spare.is_null() {
        unsafe { DestroyIcon(spare) };
    }
    unsafe { DestroyIcon(chosen) };

    if written {
        Some(ico_path.to_string_lossy().to_string())
    } else {
        None
    }
}

/// Render an HICON to a standard 32bpp .ico file (XOR + AND mask).
#[cfg(target_os = "windows")]
unsafe fn icon_to_ico(hicon: HICON, ico_path: &Path) -> bool {
    use windows_sys::Win32::Graphics::Gdi::DeleteObject;
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetIconInfo, ICONINFO};

    let mut info: ICONINFO = std::mem::zeroed();
    if GetIconInfo(hicon, &mut info) == 0 {
        return false;
    }
    let color_hbm = info.hbmColor;
    let mask_hbm = info.hbmMask;

    let mut ok = false;
    if !color_hbm.is_null() {
        if let Some((w, h, color_bgra)) = bitmap_to_bgra(color_hbm) {
            // Legacy icons carry transparency in the AND mask instead of an
            // alpha channel. Detect real alpha; if absent, build the mask.
            let has_alpha = color_bgra
                .chunks_exact(4)
                .any(|px| px[3] > 0 && px[3] < 255);
            let and_mask = if has_alpha || mask_hbm.is_null() {
                vec![0u8; (row_bytes(w) * h) as usize]
            } else if let Some((_, _, mask_bgra)) = bitmap_to_bgra(mask_hbm) {
                compute_and_mask(w, h, &mask_bgra)
            } else {
                vec![0u8; (row_bytes(w) * h) as usize]
            };
            ok = std::fs::write(ico_path, build_ico(w, h, &color_bgra, &and_mask)).is_ok();
        }
    }

    if !color_hbm.is_null() {
        DeleteObject(color_hbm as _);
    }
    if !mask_hbm.is_null() {
        DeleteObject(mask_hbm as _);
    }
    ok
}

/// Monochrome AND-mask rows are padded to 32-bit boundaries.
#[cfg(target_os = "windows")]
fn row_bytes(width: u32) -> u32 {
    width.div_ceil(32) * 4
}

/// Build the AND mask (1 bit per pixel, MSB-first, 1 = transparent) from a
/// 32bpp monochrome conversion of the icon's mask bitmap (white = transparent).
#[cfg(target_os = "windows")]
fn compute_and_mask(width: u32, height: u32, mask_bgra: &[u8]) -> Vec<u8> {
    let rb = row_bytes(width) as usize;
    let mut and = vec![0u8; rb * height as usize];
    for y in 0..height as usize {
        for x in 0..width as usize {
            if mask_bgra[(y * width as usize + x) * 4] > 0 {
                and[y * rb + x / 8] |= 0x80 >> (x % 8);
            }
        }
    }
    and
}

/// Serialize a 32bpp icon: ICONDIR + ICONDIRENTRY + BITMAPINFOHEADER (2x
/// height) + XOR bitmap + AND mask.
#[cfg(target_os = "windows")]
fn build_ico(width: u32, height: u32, xor_bgra: &[u8], and_mask: &[u8]) -> Vec<u8> {
    use windows_sys::Win32::Graphics::Gdi::BI_RGB;

    let xor_size = width * height * 4;
    let bytes_in_res = 40 + xor_size + and_mask.len() as u32;
    let mut out = Vec::with_capacity(22 + bytes_in_res as usize);

    // ICONDIR
    out.extend_from_slice(&0u16.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes());
    // ICONDIRENTRY
    out.push(if width >= 256 { 0 } else { width as u8 });
    out.push(if height >= 256 { 0 } else { height as u8 });
    out.push(0); // color count
    out.push(0); // reserved
    out.extend_from_slice(&1u16.to_le_bytes()); // planes
    out.extend_from_slice(&32u16.to_le_bytes()); // bit count
    out.extend_from_slice(&bytes_in_res.to_le_bytes());
    out.extend_from_slice(&22u32.to_le_bytes()); // image offset = 6 + 16
                                                 // BITMAPINFOHEADER (height doubled: XOR + AND)
    out.extend_from_slice(&40u32.to_le_bytes());
    out.extend_from_slice(&(width as i32).to_le_bytes());
    out.extend_from_slice(&((height as i32) * 2).to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&32u16.to_le_bytes());
    out.extend_from_slice(&BI_RGB.to_le_bytes());
    out.extend_from_slice(&xor_size.to_le_bytes());
    out.extend_from_slice(&[0u8; 16]);
    // XOR bitmap (BGRA, bottom-up DIB)
    out.extend_from_slice(xor_bgra);
    // AND mask
    out.extend_from_slice(and_mask);
    out
}

/// Read an HBITMAP as top-down 32bpp BGRA. Returns (width, height, pixels).
#[cfg(target_os = "windows")]
unsafe fn bitmap_to_bgra(hbm: HBITMAP) -> Option<(u32, u32, Vec<u8>)> {
    use windows_sys::Win32::Graphics::Gdi::{
        CreateCompatibleDC, DeleteDC, GetDIBits, GetObjectW, BITMAP, BITMAPINFO, BITMAPINFOHEADER,
        BI_RGB, DIB_RGB_COLORS, HDC,
    };

    let mut bmp: BITMAP = std::mem::zeroed();
    if GetObjectW(
        hbm as _,
        std::mem::size_of::<BITMAP>() as i32,
        &mut bmp as *mut _ as *mut std::ffi::c_void,
    ) == 0
    {
        return None;
    }
    let w = bmp.bmWidth as u32;
    let h = bmp.bmHeight as u32;
    if w == 0 || h == 0 {
        return None;
    }

    let hdc: HDC = CreateCompatibleDC(std::ptr::null_mut());
    if hdc.is_null() {
        return None;
    }

    // Negative height requests top-down row order.
    let mut bmi: BITMAPINFO = std::mem::zeroed();
    bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
    bmi.bmiHeader.biWidth = w as i32;
    bmi.bmiHeader.biHeight = -(h as i32);
    bmi.bmiHeader.biPlanes = 1;
    bmi.bmiHeader.biBitCount = 32;
    bmi.bmiHeader.biCompression = BI_RGB;

    let mut buf = vec![0u8; (w * h * 4) as usize];
    let lines = GetDIBits(
        hdc,
        hbm,
        0,
        h,
        buf.as_mut_ptr() as *mut std::ffi::c_void,
        &mut bmi,
        DIB_RGB_COLORS,
    );
    DeleteDC(hdc);
    if lines == 0 {
        return None;
    }
    Some((w, h, buf))
}

/// Cached installed apps — scanned once, served forever.
static INSTALLED_APPS_CACHE: LazyLock<Mutex<Option<Vec<InstalledApp>>>> =
    LazyLock::new(|| Mutex::new(None));

/// Flag: a scan is already in progress on another thread.
static SCAN_IN_PROGRESS: LazyLock<(Mutex<bool>, std::sync::Condvar)> =
    LazyLock::new(|| (Mutex::new(false), std::sync::Condvar::new()));

/// Get all installed applications (cross-platform), cached after first call.
///
/// The cache mutex is NOT held during the (slow) scan — only during the brief
/// check and store operations. A condvar prevents duplicate concurrent scans:
/// the first caller runs the scan while latecomers wait on the condvar and then
/// read the freshly cached result.
pub fn get_installed_apps() -> Vec<InstalledApp> {
    // Fast path: cache is already populated.
    {
        let cache = INSTALLED_APPS_CACHE.lock().unwrap();
        if let Some(ref cached) = *cache {
            return cached.clone();
        }
    }

    let (lock, cvar) = &*SCAN_IN_PROGRESS;
    let mut scanning = lock.lock().unwrap();

    // Another thread may have populated the cache while we waited for the flag.
    {
        let cache = INSTALLED_APPS_CACHE.lock().unwrap();
        if let Some(ref cached) = *cache {
            return cached.clone();
        }
    }

    if *scanning {
        // A scan is already running on another thread — wait for it.
        while *scanning {
            scanning = cvar.wait(scanning).unwrap();
        }
        // The scan finished; the cache should be populated now.
        let cache = INSTALLED_APPS_CACHE.lock().unwrap();
        return cache.as_ref().cloned().unwrap_or_default();
    }

    // We are the first caller — claim the scan.
    *scanning = true;
    drop(scanning);

    let start = std::time::Instant::now();
    let apps = scan_installed_apps();
    tracing::info!(
        elapsed_ms = start.elapsed().as_millis(),
        count = apps.len(),
        "Installed apps scan complete"
    );

    // Store result and clear the flag.
    {
        let mut cache = INSTALLED_APPS_CACHE.lock().unwrap();
        *cache = Some(apps.clone());
    }
    {
        let mut scanning = lock.lock().unwrap();
        *scanning = false;
        cvar.notify_all();
    }

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
    apps.sort_by_key(|a| a.name.to_lowercase());
    apps
}

/// Get installed applications on Windows from Start Menu shortcuts, registry, and UWP packages natively.
#[cfg(target_os = "windows")]
fn get_installed_apps_windows() -> Vec<InstalledApp> {
    let mut apps = Vec::new();

    // 1. Scan registry for standard installed programs (winreg - < 5ms)
    let t = Instant::now();
    scan_registry_apps(&mut apps);
    tracing::info!(
        elapsed_ms = t.elapsed().as_millis(),
        count = apps.len(),
        "Registry scan complete"
    );

    // 2. Scan Start Menu shortcuts natively using Win32 IShellLink COM (< 10ms, 0% CPU)
    let t = Instant::now();
    scan_start_menu_shortcuts_native(&mut apps);
    tracing::info!(
        elapsed_ms = t.elapsed().as_millis(),
        count = apps.len(),
        "Native Start Menu scan complete"
    );

    // 3. Scan UWP apps natively via Windows Registry (< 5ms)
    let t = Instant::now();
    scan_uwp_apps_native(&mut apps);
    tracing::info!(
        elapsed_ms = t.elapsed().as_millis(),
        count = apps.len(),
        "Native UWP scan complete"
    );

    // Sort by name
    apps.sort_by_key(|a| a.name.to_lowercase());

    // Deduplicate by name
    apps.dedup_by(|a, b| a.name.to_lowercase() == b.name.to_lowercase());

    apps
}

#[cfg(target_os = "windows")]
const CLSID_SHELL_LINK: windows_sys::core::GUID = windows_sys::core::GUID {
    data1: 0x00021401,
    data2: 0x0000,
    data3: 0x0000,
    data4: [0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46],
};

#[cfg(target_os = "windows")]
const IID_ISHELL_LINK_W: windows_sys::core::GUID = windows_sys::core::GUID {
    data1: 0x000214f9,
    data2: 0x0000,
    data3: 0x0000,
    data4: [0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46],
};

#[cfg(target_os = "windows")]
const IID_IPERSIST_FILE: windows_sys::core::GUID = windows_sys::core::GUID {
    data1: 0x0000010b,
    data2: 0x0000,
    data3: 0x0000,
    data4: [0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46],
};

/// Resolve a .lnk shortcut target natively using COM interface with binary parse fallback.
#[cfg(target_os = "windows")]
fn resolve_shortcut_target_native(lnk_path: &Path) -> Option<PathBuf> {
    if let Some(target) = resolve_shortcut_target_com(lnk_path) {
        return Some(target);
    }
    resolve_shortcut_target_binary(lnk_path)
}

#[cfg(target_os = "windows")]
fn resolve_shortcut_target_com(lnk_path: &Path) -> Option<PathBuf> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Foundation::MAX_PATH;
    use windows_sys::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
        COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE, STGM_READ,
    };
    use windows_sys::Win32::UI::Shell::SLGP_RAWPATH;

    unsafe {
        let _hr = CoInitializeEx(
            std::ptr::null_mut(),
            (COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE) as u32,
        );

        let mut shell_link: *mut std::ffi::c_void = std::ptr::null_mut();
        let hr = CoCreateInstance(
            &CLSID_SHELL_LINK,
            std::ptr::null_mut(),
            CLSCTX_INPROC_SERVER,
            &IID_ISHELL_LINK_W,
            &mut shell_link,
        );

        if hr < 0 || shell_link.is_null() {
            CoUninitialize();
            return None;
        }

        #[repr(C)]
        struct IShellLinkWVtbl {
            query_interface: unsafe extern "system" fn(
                this: *mut std::ffi::c_void,
                riid: *const windows_sys::core::GUID,
                ppv: *mut *mut std::ffi::c_void,
            ) -> i32,
            add_ref: unsafe extern "system" fn(this: *mut std::ffi::c_void) -> u32,
            release: unsafe extern "system" fn(this: *mut std::ffi::c_void) -> u32,
            get_path: unsafe extern "system" fn(
                this: *mut std::ffi::c_void,
                psz_file: *mut u16,
                cch: i32,
                pfd: *mut std::ffi::c_void,
                f_flags: u32,
            ) -> i32,
            get_id_list: *const std::ffi::c_void,
            set_id_list: *const std::ffi::c_void,
            get_description: *const std::ffi::c_void,
            set_description: *const std::ffi::c_void,
            get_working_directory: *const std::ffi::c_void,
            set_working_directory: *const std::ffi::c_void,
            get_arguments: *const std::ffi::c_void,
            set_arguments: *const std::ffi::c_void,
            get_hotkey: *const std::ffi::c_void,
            set_hotkey: *const std::ffi::c_void,
            get_show_cmd: *const std::ffi::c_void,
            set_show_cmd: *const std::ffi::c_void,
            get_icon_location: *const std::ffi::c_void,
            set_icon_location: *const std::ffi::c_void,
            set_relative_path: *const std::ffi::c_void,
            resolve: *const std::ffi::c_void,
            set_path: *const std::ffi::c_void,
        }

        #[repr(C)]
        struct IPersistFileVtbl {
            query_interface: unsafe extern "system" fn(
                this: *mut std::ffi::c_void,
                riid: *const windows_sys::core::GUID,
                ppv: *mut *mut std::ffi::c_void,
            ) -> i32,
            add_ref: unsafe extern "system" fn(this: *mut std::ffi::c_void) -> u32,
            release: unsafe extern "system" fn(this: *mut std::ffi::c_void) -> u32,
            get_class_id: *const std::ffi::c_void,
            is_dirty: *const std::ffi::c_void,
            load: unsafe extern "system" fn(
                this: *mut std::ffi::c_void,
                psz_file_name: *const u16,
                dw_mode: u32,
            ) -> i32,
            save: *const std::ffi::c_void,
            save_completed: *const std::ffi::c_void,
            get_cur_file: *const std::ffi::c_void,
        }

        let link_vtbl = *(shell_link as *mut *mut IShellLinkWVtbl);
        let mut persist_file: *mut std::ffi::c_void = std::ptr::null_mut();

        let query_hr =
            ((**link_vtbl).query_interface)(shell_link, &IID_IPERSIST_FILE, &mut persist_file);

        let mut target_path = None;

        if query_hr >= 0 && !persist_file.is_null() {
            let pf_vtbl = *(persist_file as *mut *mut IPersistFileVtbl);
            let wide_path: Vec<u16> = lnk_path
                .as_os_str()
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            let load_hr = ((**pf_vtbl).load)(persist_file, wide_path.as_ptr(), STGM_READ as u32);
            if load_hr >= 0 {
                let mut buffer = [0u16; MAX_PATH as usize];
                let get_path_hr = ((**link_vtbl).get_path)(
                    shell_link,
                    buffer.as_mut_ptr(),
                    MAX_PATH as i32,
                    std::ptr::null_mut(),
                    SLGP_RAWPATH as u32,
                );

                if get_path_hr >= 0 {
                    let len = buffer.iter().position(|&c| c == 0).unwrap_or(buffer.len());
                    if len > 0 {
                        let path_str = String::from_utf16_lossy(&buffer[..len]);
                        if !path_str.trim().is_empty() {
                            target_path = Some(PathBuf::from(path_str));
                        }
                    }
                }
            }
            ((**pf_vtbl).release)(persist_file);
        }

        ((**link_vtbl).release)(shell_link);
        CoUninitialize();

        target_path
    }
}

#[cfg(target_os = "windows")]
fn resolve_shortcut_target_binary(lnk_path: &Path) -> Option<PathBuf> {
    let bytes = fs::read(lnk_path).ok()?;
    if bytes.len() < 76 || bytes[0..4] != [0x4C, 0x00, 0x00, 0x00] {
        return None;
    }
    let content = String::from_utf8_lossy(&bytes);
    for word in content.split('\0') {
        let trimmed = word.trim_matches(|c: char| c.is_control() || c == '"' || c == '\'');
        if (trimmed.starts_with("C:\\")
            || trimmed.starts_with("D:\\")
            || trimmed.starts_with("E:\\"))
            && trimmed.to_lowercase().ends_with(".exe")
        {
            let p = PathBuf::from(trimmed);
            if p.exists() {
                return Some(p);
            }
        }
    }
    None
}

/// Recursively scan Start Menu directories for .lnk shortcut files natively in Rust.
#[cfg(target_os = "windows")]
fn scan_start_menu_shortcuts_native(apps: &mut Vec<InstalledApp>) {
    let mut dirs = Vec::new();

    if let Ok(common) = std::env::var("PROGRAMDATA") {
        dirs.push(PathBuf::from(common).join(r"Microsoft\Windows\Start Menu\Programs"));
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        dirs.push(PathBuf::from(appdata).join(r"Microsoft\Windows\Start Menu\Programs"));
    }
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        dirs.push(PathBuf::from(local_appdata).join(r"Microsoft\Windows\Application Shortcuts"));
    }

    let skip_keywords = [
        "uninstall",
        "readme",
        "help",
        "license",
        "changelog",
        "release notes",
        "website",
        "documentation",
    ];

    for dir in dirs {
        if dir.exists() && dir.is_dir() {
            walk_lnk_directory(&dir, 0, 4, &skip_keywords, apps);
        }
    }
}

#[cfg(target_os = "windows")]
fn walk_lnk_directory(
    dir: &Path,
    depth: usize,
    max_depth: usize,
    skip_keywords: &[&str],
    apps: &mut Vec<InstalledApp>,
) {
    if depth > max_depth {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            walk_lnk_directory(&path, depth + 1, max_depth, skip_keywords, apps);
            continue;
        }

        if path
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("lnk"))
        {
            let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
                continue;
            };

            let lower_name = stem.to_lowercase();
            if skip_keywords.iter().any(|k| lower_name.contains(k)) {
                continue;
            }

            if apps.iter().any(|a| a.name.eq_ignore_ascii_case(stem)) {
                continue;
            }

            if let Some(target) = resolve_shortcut_target_native(&path) {
                if target
                    .extension()
                    .is_some_and(|ext| ext.eq_ignore_ascii_case("exe"))
                    && target.exists()
                {
                    let target_str = target.to_string_lossy().to_string();
                    apps.push(InstalledApp {
                        name: stem.to_string(),
                        exec: Some(target_str.clone()),
                        icon: Some(target_str),
                        desktop_file: path
                            .file_name()
                            .map(|f| f.to_string_lossy().to_string())
                            .unwrap_or_default(),
                        categories: Vec::new(),
                    });
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

            // Skip system components, hidden entries, and sub-components
            let is_system: bool = subkey.get_value("SystemComponent").unwrap_or(0u32) == 1;
            let no_display: bool = subkey.get_value("NoDisplay").unwrap_or(0u32) == 1;
            let is_parent: bool = subkey.get_value::<String, _>("ParentKeyName").is_ok();
            if is_system || no_display || is_parent {
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

/// Scan Windows Store (UWP/AppX) apps natively via Windows Registry (< 5ms, no PowerShell).
#[cfg(target_os = "windows")]
fn scan_uwp_apps_native(apps: &mut Vec<InstalledApp>) {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = "Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\Repository\\Packages";

    let Ok(key) = hkcu.open_subkey_with_flags(path, KEY_READ) else {
        return;
    };

    for name in key.enum_keys().flatten() {
        let Ok(subkey) = key.open_subkey_with_flags(&name, KEY_READ) else {
            continue;
        };

        let display_name: String = match subkey.get_value("DisplayName") {
            Ok(n) => n,
            Err(_) => continue,
        };

        // Resource strings look like @{PackageName?ms-resource://...} - skip unresolved raw strings
        if display_name.starts_with('@') || display_name.trim().is_empty() {
            continue;
        }

        if apps
            .iter()
            .any(|a| a.name.eq_ignore_ascii_case(&display_name))
        {
            continue;
        }

        let package_id: String = subkey.get_value("PackageID").unwrap_or_default();
        let install_location: Option<String> = subkey.get_value("PackageRootFolder").ok();

        apps.push(InstalledApp {
            name: display_name,
            exec: install_location
                .clone()
                .map(|_| format!("explorer.exe shell:AppsFolder\\{}", package_id)),
            icon: install_location,
            desktop_file: name,
            categories: Vec::new(),
        });
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
    let mut terminal = false;
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

            let key_lower = key.to_lowercase();

            if key_lower == "nodisplay" || key_lower.starts_with("nodisplay[") {
                if value.eq_ignore_ascii_case("true")
                    || value == "1"
                    || value.eq_ignore_ascii_case("yes")
                {
                    no_display = true;
                }
            } else if key_lower == "hidden" || key_lower.starts_with("hidden[") {
                if value.eq_ignore_ascii_case("true")
                    || value == "1"
                    || value.eq_ignore_ascii_case("yes")
                {
                    hidden = true;
                }
            } else if key_lower == "terminal" {
                if value.eq_ignore_ascii_case("true")
                    || value == "1"
                    || value.eq_ignore_ascii_case("yes")
                {
                    terminal = true;
                }
            } else {
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
                    "Type" => app_type = Some(value.to_string()),
                    _ => {}
                }
            }
        }
    }

    // Skip hidden apps, terminal CLI tools, non-application types, or apps without names
    if no_display || hidden || terminal {
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

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::*;

    #[test]
    fn test_parse_desktop_file_filters_nodisplay_and_hidden() {
        let temp_dir =
            std::env::temp_dir().join(format!("zenith_desktop_test_{}", std::process::id()));
        let _ = std::fs::create_dir_all(&temp_dir);

        let desktop_nodisplay = temp_dir.join("test_nodisplay.desktop");
        std::fs::write(
            &desktop_nodisplay,
            "[Desktop Entry]\nType=Application\nName=Secret App\nExec=secret\nNoDisplay=true\n",
        )
        .unwrap();

        assert!(parse_desktop_file(&desktop_nodisplay).is_none());

        let desktop_hidden = temp_dir.join("test_hidden.desktop");
        std::fs::write(
            &desktop_hidden,
            "[Desktop Entry]\nType=Application\nName=Hidden App\nExec=hidden\nHidden=true\n",
        )
        .unwrap();

        assert!(parse_desktop_file(&desktop_hidden).is_none());

        let desktop_valid = temp_dir.join("test_valid.desktop");
        std::fs::write(
            &desktop_valid,
            "[Desktop Entry]\nType=Application\nName=Normal App\nExec=normal\n",
        )
        .unwrap();

        let app = parse_desktop_file(&desktop_valid).expect("should parse valid app");
        assert_eq!(app.name, "Normal App");

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
