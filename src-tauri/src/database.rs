use crate::migrations;
use chrono::Utc;
use rusqlite::{Connection, OptionalExtension, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct App {
    pub id: i64,
    pub name: String,
    pub path: Option<String>,
    pub icon_path: Option<String>,
    pub category: Option<String>,
    pub is_blocked: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlyUsage {
    pub hour: i32,
    pub total_seconds: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryUsage {
    pub category: String,
    pub total_seconds: i64,
    pub app_count: i64,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageSession {
    pub id: i64,
    pub app_id: i64,
    pub app_name: String,
    pub start_time: i64,
    pub end_time: i64,
    pub duration_seconds: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppLimit {
    pub id: i64,
    pub app_id: i64,
    pub app_name: String,
    pub daily_limit_minutes: i32,
    pub block_when_exceeded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppUsage {
    pub app_name: String,
    pub duration_seconds: i64,
    pub session_count: i64,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusNote {
    pub id: i64,
    pub session_start_time: i64,
    pub session_end_time: Option<i64>,
    pub content: String,
    pub duration_minutes: i32,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportRecord {
    pub date: String,
    pub app_name: String,
    pub category: String,
    pub duration_seconds: i64,
    pub session_count: i64,
}

pub struct Database {
    conn: Connection,
}

fn categorize_app(name: &str) -> Option<&'static str> {
    match name {
        "Visual Studio Code" | "VSCodium" | "Zed" | "Cursor" | "OpenCode" | "Notepad++"
        | "Sublime Text" => Some("Development"),
        "Alacritty" | "kitty" | "Ghostty" | "Foot" | "WezTerm" | "Terminal"
        | "Windows Terminal" | "Command Prompt" | "PowerShell" => Some("Development"),
        "Firefox" | "Chrome" | "Chromium" | "Brave" | "Zen Browser" | "Microsoft Edge" => {
            Some("Browsing")
        }
        "Discord" | "Slack" | "Telegram" | "Thunderbird" | "Microsoft Teams" | "Outlook" => {
            Some("Communication")
        }
        "Spotify" | "VLC" => Some("Entertainment"),
        "Steam" => Some("Gaming"),
        "Obsidian"
        | "LibreOffice"
        | "Notion"
        | "Microsoft Word"
        | "Microsoft Excel"
        | "Microsoft PowerPoint"
        | "GIMP"
        | "Inkscape"
        | "Blender"
        | "Photoshop" => Some("Productivity"),
        "Files" | "Thunar" | "Dolphin" | "File Explorer" => Some("Utilities"),
        _ => None,
    }
}

impl Database {
    pub fn new(db_path: PathBuf) -> SqliteResult<Self> {
        let conn = Connection::open(db_path)?;

        // Enable WAL mode for better concurrent read/write performance.
        // WAL allows readers to proceed without blocking writers and vice versa,
        // which is critical since the background tracker writes every 5 seconds
        // while the UI reads concurrently.
        conn.pragma_update(None, "journal_mode", "WAL")?;

        // Set a busy timeout so queries wait instead of immediately failing
        // when the database is locked by another operation.
        conn.pragma_update(None, "busy_timeout", 5000)?;

        // Enable foreign keys (off by default in SQLite)
        conn.pragma_update(None, "foreign_keys", "ON")?;

        let db = Database { conn };
        db.init_schema()?;
        db.run_migrations()?;
        db.auto_categorize_uncategorized()?;
        Ok(db)
    }

    #[cfg(test)]
    pub fn new_in_memory() -> SqliteResult<Self> {
        let conn = Connection::open_in_memory()?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "busy_timeout", 5000)?;
        conn.pragma_update(None, "foreign_keys", "ON")?;

        let db = Database { conn };
        db.init_schema()?;
        db.run_migrations()?;
        Ok(db)
    }

    fn init_schema(&self) -> SqliteResult<()> {
        // Create core tables - these are the base schema
        // Note: category, is_blocked were added by migration 1 but are included here
        // so fresh installs get the complete schema without relying on ALTER TABLE.
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS apps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                path TEXT,
                icon_path TEXT,
                category TEXT,
                is_blocked INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS usage_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_id INTEGER NOT NULL,
                start_time INTEGER NOT NULL,
                end_time INTEGER NOT NULL,
                duration_seconds INTEGER NOT NULL,
                FOREIGN KEY (app_id) REFERENCES apps(id)
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS app_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_id INTEGER NOT NULL UNIQUE,
                daily_limit_minutes INTEGER NOT NULL,
                block_when_exceeded INTEGER DEFAULT 0,
                FOREIGN KEY (app_id) REFERENCES apps(id)
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS focus_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_start_time INTEGER NOT NULL,
                session_end_time INTEGER,
                content TEXT NOT NULL,
                duration_minutes INTEGER NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )",
            [],
        )?;

        Ok(())
    }

    /// Run database migrations to update schema
    fn run_migrations(&self) -> SqliteResult<()> {
        migrations::run_migrations(&self.conn)?;
        Ok(())
    }

    pub fn get_or_create_app(&self, name: &str, path: Option<String>) -> SqliteResult<i64> {
        if let Ok((id, category)) = self.conn.query_row(
            "SELECT id, category FROM apps WHERE name = ?1",
            [name],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, Option<String>>(1)?)),
        ) {
            if category.is_none() {
                if let Some(cat) = categorize_app(name) {
                    self.conn.execute(
                        "UPDATE apps SET category = ?1 WHERE id = ?2",
                        rusqlite::params![cat, id],
                    )?;
                }
            }
            return Ok(id);
        }

        let category = categorize_app(name);
        self.conn.execute(
            "INSERT INTO apps (name, path, category) VALUES (?1, ?2, ?3)",
            rusqlite::params![name, &path.unwrap_or_default(), category],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    fn auto_categorize_uncategorized(&self) -> SqliteResult<()> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name FROM apps WHERE category IS NULL")?;
        let rows: Vec<(i64, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect::<Result<Vec<_>, _>>()?;
        for (id, name) in rows {
            if let Some(cat) = categorize_app(&name) {
                self.conn.execute(
                    "UPDATE apps SET category = ?1 WHERE id = ?2",
                    rusqlite::params![cat, id],
                )?;
            }
        }
        Ok(())
    }

    /// Records a usage session atomically using a transaction.
    /// This ensures either all operations succeed or none do.
    pub fn record_usage_atomic(
        &mut self,
        app_name: &str,
        duration_seconds: i64,
    ) -> SqliteResult<()> {
        let tx = self.conn.transaction()?;

        // Get or create app
        let app_id: i64 =
            match tx.query_row("SELECT id FROM apps WHERE name = ?1", [app_name], |row| {
                row.get(0)
            }) {
                Ok(id) => id,
                Err(_) => {
                    tx.execute(
                        "INSERT INTO apps (name, path) VALUES (?1, ?2)",
                        [app_name, ""],
                    )?;
                    tx.last_insert_rowid()
                }
            };

        let now = Utc::now().timestamp();
        let start_time = now - duration_seconds;

        // Create session with all data at once
        tx.execute(
            "INSERT INTO usage_sessions (app_id, start_time, end_time, duration_seconds) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![app_id, start_time, now, duration_seconds],
        )?;

        tx.commit()
    }

    pub fn cleanup_orphaned_sessions(&self, max_age_seconds: i64) -> SqliteResult<usize> {
        let rows = self.conn.execute(
            "DELETE FROM usage_sessions WHERE duration_seconds = 0 AND end_time = start_time AND start_time < strftime('%s','now') - ?1",
            rusqlite::params![max_age_seconds],
        )?;
        Ok(rows)
    }

    pub fn start_session(&self, app_id: i64, start_time: i64) -> SqliteResult<i64> {
        self.conn.execute(
            "INSERT INTO usage_sessions (app_id, start_time, end_time, duration_seconds) VALUES (?1, ?2, ?2, 0)",
            rusqlite::params![app_id, start_time],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn end_session(&self, session_id: i64, end_time: i64) -> SqliteResult<()> {
        let duration: i64 = self.conn.query_row(
            "SELECT start_time FROM usage_sessions WHERE id = ?1",
            rusqlite::params![session_id],
            |row| {
                let start_time: i64 = row.get(0)?;
                Ok(end_time - start_time)
            },
        )?;

        self.conn.execute(
            "UPDATE usage_sessions SET end_time = ?1, duration_seconds = ?2 WHERE id = ?3",
            rusqlite::params![end_time, duration, session_id],
        )?;

        Ok(())
    }

    pub fn update_session_duration(&self, session_id: i64, end_time: i64) -> SqliteResult<()> {
        let rows = self.conn.execute(
            "UPDATE usage_sessions SET end_time = ?1, duration_seconds = ?1 - start_time WHERE id = ?2",
            rusqlite::params![end_time, session_id],
        )?;
        if rows != 1 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        Ok(())
    }

    pub fn get_usage_today(&self, app_name: &str) -> SqliteResult<i64> {
        // Use SQLite's local time calculation for start of day
        // For in-progress sessions, compute duration dynamically
        self.conn.query_row(
            "SELECT COALESCE(SUM(
                CASE WHEN us.duration_seconds = 0 AND us.end_time = us.start_time AND us.start_time > strftime('%s','now') - 15
                     THEN MAX(strftime('%s','now') - us.start_time, 0)
                     ELSE us.duration_seconds
                END
             ), 0) FROM usage_sessions us
             JOIN apps a ON us.app_id = a.id
             WHERE a.name = ?1 AND date(us.start_time, 'unixepoch', 'localtime') = date('now', 'localtime')",
            rusqlite::params![app_name],
            |row| row.get(0),
        )
    }

    pub fn get_daily_usage(&self) -> SqliteResult<Vec<AppUsage>> {
        // Use SQLite's local time calculation
        // For in-progress sessions (end_time == start_time, duration_seconds == 0),
        // compute duration dynamically so they appear immediately in the UI
        // Only applies to sessions started within last 15s to avoid orphaned session accumulation
        let mut stmt = self.conn.prepare(
            "SELECT a.name,
                    COALESCE(SUM(
                        CASE WHEN us.duration_seconds = 0 AND us.end_time = us.start_time AND us.start_time > strftime('%s','now') - 15
                             THEN MAX(strftime('%s','now') - us.start_time, 0)
                             ELSE us.duration_seconds
                        END
                    ), 0) as total_duration,
                    COUNT(us.id), a.category
             FROM apps a
             LEFT JOIN usage_sessions us ON a.id = us.app_id 
                AND date(us.start_time, 'unixepoch', 'localtime') = date('now', 'localtime')
             GROUP BY a.id
             HAVING total_duration > 0 OR COUNT(us.id) > 0
             ORDER BY total_duration DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(AppUsage {
                app_name: row.get(0)?,
                duration_seconds: row.get(1)?,
                session_count: row.get(2)?,
                category: row.get(3)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn get_weekly_stats(&self) -> SqliteResult<Vec<(i64, i64)>> {
        let cutoff = Utc::now().timestamp() - (30 * 24 * 60 * 60);

        let mut stmt = self.conn.prepare(
            "SELECT DATE(start_time, 'unixepoch', 'localtime') as day,
                    SUM(CASE WHEN duration_seconds = 0 AND end_time = start_time AND start_time > strftime('%s','now') - 15
                             THEN MAX(strftime('%s','now') - start_time, 0)
                             ELSE duration_seconds END)
             FROM usage_sessions
             WHERE start_time >= ?1
             GROUP BY day
             ORDER BY day ASC",
        )?;

        let rows = stmt.query_map([cutoff], |row| {
            let day_str: String = row.get(0)?;
            // Parse the date string, falling back to current time if parsing fails
            let day = chrono::NaiveDate::parse_from_str(&day_str, "%Y-%m-%d")
                .ok()
                .and_then(|d| d.and_hms_opt(12, 0, 0)) // Use noon to avoid timezone edge cases
                .map(|dt| dt.and_utc().timestamp())
                .unwrap_or_else(|| Utc::now().timestamp());
            Ok((day, row.get(1)?))
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn set_limit(&self, app_name: &str, minutes: i32) -> SqliteResult<()> {
        let app_id = self.get_or_create_app(app_name, None)?;
        self.conn.execute(
            "INSERT OR REPLACE INTO app_limits (app_id, daily_limit_minutes) VALUES (?1, ?2)",
            rusqlite::params![app_id, minutes as i64],
        )?;
        Ok(())
    }

    pub fn get_limit(&self, app_name: &str) -> SqliteResult<Option<i32>> {
        self.conn
            .query_row(
                "SELECT al.daily_limit_minutes FROM app_limits al
             JOIN apps a ON al.app_id = a.id
             WHERE a.name = ?1",
                [app_name],
                |row| row.get(0),
            )
            .optional()
    }

    pub fn get_all_limits(&self) -> SqliteResult<Vec<AppLimit>> {
        let mut stmt = self.conn.prepare(
            "SELECT al.id, al.app_id, a.name, al.daily_limit_minutes, COALESCE(al.block_when_exceeded, 0)
             FROM app_limits al
             JOIN apps a ON al.app_id = a.id",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(AppLimit {
                id: row.get(0)?,
                app_id: row.get(1)?,
                app_name: row.get(2)?,
                daily_limit_minutes: row.get(3)?,
                block_when_exceeded: row.get::<_, i32>(4)? != 0,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn remove_limit(&self, app_name: &str) -> SqliteResult<()> {
        self.conn.execute(
            "DELETE FROM app_limits WHERE app_id = (SELECT id FROM apps WHERE name = ?1)",
            [app_name],
        )?;
        Ok(())
    }

    pub fn set_limit_with_block(
        &self,
        app_name: &str,
        minutes: i32,
        block_when_exceeded: bool,
    ) -> SqliteResult<()> {
        let app_id = self.get_or_create_app(app_name, None)?;
        self.conn.execute(
            "INSERT OR REPLACE INTO app_limits (app_id, daily_limit_minutes, block_when_exceeded) VALUES (?1, ?2, ?3)",
            rusqlite::params![app_id, minutes as i64, block_when_exceeded as i32],
        )?;
        Ok(())
    }

    pub fn set_app_category(&self, app_name: &str, category: &str) -> SqliteResult<()> {
        self.conn.execute(
            "UPDATE apps SET category = ?1 WHERE name = ?2",
            rusqlite::params![category, app_name],
        )?;
        Ok(())
    }

    pub fn get_hourly_usage(&self) -> SqliteResult<Vec<HourlyUsage>> {
        let mut stmt = self.conn.prepare(
                    "SELECT CAST(strftime('%H', start_time, 'unixepoch', 'localtime') AS INTEGER) as hour, 
                    SUM(
                        CASE WHEN duration_seconds = 0 AND end_time = start_time AND start_time > strftime('%s','now') - 15
                             THEN MAX(strftime('%s','now') - start_time, 0)
                             ELSE duration_seconds
                        END
                    ) as total
             FROM usage_sessions
             WHERE date(start_time, 'unixepoch', 'localtime') = date('now', 'localtime')
             GROUP BY hour
             ORDER BY hour ASC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(HourlyUsage {
                hour: row.get(0)?,
                total_seconds: row.get(1)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn get_weekly_hourly_usage(&self) -> SqliteResult<Vec<(String, i32, i64)>> {
        let week_ago = Utc::now().timestamp() - (6 * 24 * 60 * 60); // Last 7 days including today
        let mut stmt = self.conn.prepare(
                    "SELECT date(start_time, 'unixepoch', 'localtime') as date_str,
                    (CAST(strftime('%H', start_time, 'unixepoch', 'localtime') AS INTEGER) * 2) + 
                    (CAST(strftime('%M', start_time, 'unixepoch', 'localtime') AS INTEGER) / 30) as half_hour, 
                    SUM(
                        CASE WHEN duration_seconds = 0 AND end_time = start_time AND start_time > strftime('%s','now') - 15
                             THEN MAX(strftime('%s','now') - start_time, 0)
                             ELSE duration_seconds
                        END
                    ) as total
             FROM usage_sessions
             WHERE start_time >= ?1
             GROUP BY date_str, half_hour
             ORDER BY date_str ASC, half_hour ASC",
        )?;

        let rows = stmt.query_map([week_ago], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn get_category_usage(&self) -> SqliteResult<Vec<CategoryUsage>> {
        let mut stmt = self.conn.prepare(
            "SELECT COALESCE(a.category, 'Uncategorized') as category, 
                    SUM(
                        CASE WHEN us.duration_seconds = 0 AND us.end_time = us.start_time AND us.start_time > strftime('%s','now') - 15
                             THEN MAX(strftime('%s','now') - us.start_time, 0)
                             ELSE us.duration_seconds
                        END
                    ) as total,
                    COUNT(DISTINCT a.id) as app_count
             FROM usage_sessions us
             JOIN apps a ON us.app_id = a.id
             WHERE date(us.start_time, 'unixepoch', 'localtime') = date('now', 'localtime')
             GROUP BY COALESCE(a.category, 'Uncategorized')
             ORDER BY total DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(CategoryUsage {
                category: row.get(0)?,
                total_seconds: row.get(1)?,
                app_count: row.get(2)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn is_app_blocked(&self, app_name: &str) -> SqliteResult<bool> {
        // Fast path: check if app has a blocking limit at all (uses index on apps.name)
        let has_blocking_limit: bool = self
            .conn
            .query_row(
                "SELECT al.block_when_exceeded = 1
             FROM apps a
             JOIN app_limits al ON a.id = al.app_id
             WHERE a.name = ?1",
                rusqlite::params![app_name],
                |row| row.get(0),
            )
            .optional()?
            .unwrap_or(false);

        if !has_blocking_limit {
            return Ok(false);
        }

        // Slow path: app has blocking enabled, check if usage exceeds limit
        let result: Option<(i32, i64)> = self
            .conn
            .query_row(
                "SELECT al.daily_limit_minutes, COALESCE(SUM(
                    CASE WHEN us.duration_seconds = 0 AND us.end_time = us.start_time AND us.start_time > strftime('%s','now') - 15
                          THEN MAX(strftime('%s','now') - us.start_time, 0)
                          ELSE us.duration_seconds
                     END
                  ), 0)
             FROM apps a
             JOIN app_limits al ON a.id = al.app_id AND al.block_when_exceeded = 1
             LEFT JOIN usage_sessions us ON a.id = us.app_id 
                AND date(us.start_time, 'unixepoch', 'localtime') = date('now', 'localtime')
             WHERE a.name = ?1
             GROUP BY a.id",
                rusqlite::params![app_name],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?;

        if let Some((limit_minutes, used_seconds)) = result {
            let limit_seconds = (limit_minutes as i64) * 60;
            return Ok(used_seconds >= limit_seconds);
        }

        Ok(false)
    }

    pub fn get_all_apps(&self) -> SqliteResult<Vec<App>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, path, icon_path, category, COALESCE(is_blocked, 0), created_at FROM apps"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(App {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                icon_path: row.get(3)?,
                category: row.get(4)?,
                is_blocked: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Get limit status for all apps with limits set
    /// Returns: (app_name, limit_minutes, used_seconds, block_when_exceeded)
    pub fn get_all_limit_status(&self) -> SqliteResult<Vec<(String, i32, i64, bool)>> {
        let mut stmt = self.conn.prepare(
            "SELECT a.name, al.daily_limit_minutes,
                    COALESCE(SUM(
                        CASE WHEN us.duration_seconds = 0 AND us.end_time = us.start_time AND us.start_time > strftime('%s','now') - 15
                             THEN MAX(strftime('%s','now') - us.start_time, 0)
                             ELSE us.duration_seconds
                        END
                    ), 0),
                    al.block_when_exceeded
             FROM apps a
             JOIN app_limits al ON a.id = al.app_id
             LEFT JOIN usage_sessions us ON a.id = us.app_id 
                AND date(us.start_time, 'unixepoch', 'localtime') = date('now', 'localtime')
             GROUP BY a.id",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i32>(3)? != 0,
            ))
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Delete usage sessions older than the specified number of days.
    /// Returns the number of deleted rows.
    pub fn cleanup_old_data(&self, retention_days: i64) -> SqliteResult<usize> {
        let cutoff = Utc::now().timestamp() - (retention_days * 24 * 60 * 60);

        let deleted = self.conn.execute(
            "DELETE FROM usage_sessions WHERE end_time < ?1",
            rusqlite::params![cutoff],
        )?;

        // Optionally vacuum to reclaim space (can be slow, so we skip it for now)
        // self.conn.execute("VACUUM", [])?;

        Ok(deleted)
    }

    /// Completely wipe all user data (usage history, limits, categories, etc.)
    pub fn wipe_all_data(&self) -> SqliteResult<()> {
        self.conn.execute("DELETE FROM usage_sessions", [])?;
        self.conn.execute("DELETE FROM app_limits", [])?;
        // Apps table holds the categories and app state
        self.conn.execute("DELETE FROM apps", [])?;
        // Vacuum to shrink the DB file size
        self.conn.execute("VACUUM", [])?;
        Ok(())
    }

    /// Export usage data within a date range
    /// Returns: Vec of (date, app_name, category, duration_seconds, session_count)
    pub fn export_usage_data(
        &self,
        start_timestamp: i64,
        end_timestamp: i64,
    ) -> SqliteResult<Vec<ExportRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                date(us.start_time, 'unixepoch', 'localtime') as date,
                a.name as app_name,
                COALESCE(a.category, 'Uncategorized') as category,
                SUM(us.duration_seconds) as total_seconds,
                COUNT(us.id) as session_count
             FROM usage_sessions us
             JOIN apps a ON us.app_id = a.id
             WHERE us.start_time >= ?1 AND us.start_time <= ?2
             GROUP BY date, a.id
             ORDER BY date DESC, total_seconds DESC",
        )?;

        let rows = stmt.query_map(rusqlite::params![start_timestamp, end_timestamp], |row| {
            Ok(ExportRecord {
                date: row.get(0)?,
                app_name: row.get(1)?,
                category: row.get(2)?,
                duration_seconds: row.get(3)?,
                session_count: row.get(4)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    pub fn import_usage_data(&mut self, records: &[ExportRecord]) -> SqliteResult<i64> {
        let tx = self.conn.transaction()?;
        let mut count = 0i64;
        let mut seen = std::collections::HashSet::new();

        for record in records {
            let key = format!("{}-{}", record.date, record.app_name);
            if seen.contains(&key) {
                continue;
            }
            seen.insert(key);

            let app_id: i64 = match tx.query_row(
                "SELECT id FROM apps WHERE name = ?1",
                [&record.app_name],
                |row| row.get(0),
            ) {
                Ok(id) => id,
                Err(_) => {
                    tx.execute(
                        "INSERT INTO apps (name, path, category) VALUES (?1, '', ?2)",
                        rusqlite::params![&record.app_name, &record.category],
                    )?;
                    tx.last_insert_rowid()
                }
            };

            let date_naive = chrono::NaiveDate::parse_from_str(&record.date, "%Y-%m-%d")
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
            let start_time = date_naive
                .and_hms_opt(0, 0, 0)
                .ok_or_else(|| {
                    let err: Box<dyn std::error::Error + Send + Sync> = "invalid datetime".into();
                    rusqlite::Error::ToSqlConversionFailure(err)
                })?
                .and_utc()
                .timestamp();
            let end_time = start_time + record.duration_seconds;

            tx.execute(
                "INSERT INTO usage_sessions (app_id, start_time, end_time, duration_seconds) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![app_id, start_time, end_time, record.duration_seconds],
            )?;
            count += 1;
        }

        tx.commit()?;
        Ok(count)
    }

    /// Get daily totals within a date range for historical analysis
    /// Returns: Vec of (date_string, total_seconds)
    pub fn get_daily_totals_in_range(
        &self,
        start_timestamp: i64,
        end_timestamp: i64,
    ) -> SqliteResult<Vec<(String, i64)>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                date(us.start_time, 'unixepoch', 'localtime') as date,
                SUM(us.duration_seconds) as total_seconds
             FROM usage_sessions us
             WHERE us.start_time >= ?1 AND us.start_time <= ?2
             GROUP BY date
             ORDER BY date ASC",
        )?;

        let rows = stmt.query_map(rusqlite::params![start_timestamp, end_timestamp], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Get app usage breakdown within a date range for historical analysis
    /// Returns: Vec of AppUsage with totals for the entire range
    pub fn get_app_usage_in_range(
        &self,
        start_timestamp: i64,
        end_timestamp: i64,
    ) -> SqliteResult<Vec<AppUsage>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                a.name,
                COALESCE(SUM(us.duration_seconds), 0) as total_seconds,
                COUNT(us.id) as session_count,
                a.category
             FROM usage_sessions us
             JOIN apps a ON us.app_id = a.id
             WHERE us.start_time >= ?1 AND us.start_time <= ?2
             GROUP BY a.id
             ORDER BY total_seconds DESC",
        )?;

        let rows = stmt.query_map(rusqlite::params![start_timestamp, end_timestamp], |row| {
            Ok(AppUsage {
                app_name: row.get(0)?,
                duration_seconds: row.get(1)?,
                session_count: row.get(2)?,
                category: row.get(3)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Get category usage within a date range for historical analysis
    pub fn get_category_usage_in_range(
        &self,
        start_timestamp: i64,
        end_timestamp: i64,
    ) -> SqliteResult<Vec<CategoryUsage>> {
        let mut stmt = self.conn.prepare(
            "SELECT 
                COALESCE(a.category, 'Uncategorized') as category,
                SUM(us.duration_seconds) as total_seconds,
                COUNT(DISTINCT a.id) as app_count
             FROM usage_sessions us
             JOIN apps a ON us.app_id = a.id
             WHERE us.start_time >= ?1 AND us.start_time <= ?2
             GROUP BY COALESCE(a.category, 'Uncategorized')
             ORDER BY total_seconds DESC",
        )?;

        let rows = stmt.query_map(rusqlite::params![start_timestamp, end_timestamp], |row| {
            Ok(CategoryUsage {
                category: row.get(0)?,
                total_seconds: row.get(1)?,
                app_count: row.get(2)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Save a focus session note
    pub fn save_focus_note(
        &self,
        session_start_time: i64,
        content: &str,
        duration_minutes: i32,
    ) -> SqliteResult<i64> {
        self.conn.execute(
            "INSERT INTO focus_notes (session_start_time, content, duration_minutes) VALUES (?1, ?2, ?3)",
            rusqlite::params![session_start_time, content, duration_minutes],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    /// Get all focus notes
    pub fn get_focus_notes(&self) -> SqliteResult<Vec<FocusNote>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_start_time, session_end_time, content, duration_minutes, created_at
             FROM focus_notes ORDER BY session_start_time DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(FocusNote {
                id: row.get(0)?,
                session_start_time: row.get(1)?,
                session_end_time: row.get(2)?,
                content: row.get(3)?,
                duration_minutes: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }

    /// Get all blocked apps in a single query (fixes N+1 query problem)
    /// Returns app names where block_when_exceeded is true AND usage exceeds limit
    pub fn get_blocked_apps(&self) -> SqliteResult<Vec<String>> {
        let mut stmt = self.conn.prepare(
            "SELECT a.name
             FROM apps a
             JOIN app_limits al ON a.id = al.app_id
             LEFT JOIN usage_sessions us ON a.id = us.app_id 
                AND date(us.start_time, 'unixepoch', 'localtime') = date('now', 'localtime')
             WHERE al.block_when_exceeded = 1
             GROUP BY a.id
             HAVING COALESCE(SUM(
                  CASE WHEN us.duration_seconds = 0 AND us.end_time = us.start_time AND us.start_time > strftime('%s','now') - 15
                       THEN MAX(strftime('%s','now') - us.start_time, 0)
                       ELSE us.duration_seconds
                  END
              ), 0) >= (al.daily_limit_minutes * 60)",
        )?;

        let rows = stmt.query_map([], |row| row.get(0))?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn update_session_duration_errors_for_missing_session() {
        let db = Database::new_in_memory().expect("in-memory db");
        let err = db.update_session_duration(999_999, Utc::now().timestamp());
        assert!(matches!(err, Err(rusqlite::Error::QueryReturnedNoRows)));
    }

    #[test]
    fn test_get_weekly_stats_includes_30_days() {
        let db = Database::new_in_memory().expect("in-memory db");
        let app_id = db.get_or_create_app("TestApp", None).unwrap();
        let now = Utc::now().timestamp();

        // 20 days ago (within 30 days)
        let time_20_days_ago = now - (20 * 24 * 60 * 60);
        let s1 = db.start_session(app_id, time_20_days_ago).unwrap();
        db.end_session(s1, time_20_days_ago + 300).unwrap();

        // 35 days ago (outside 30 days)
        let time_35_days_ago = now - (35 * 24 * 60 * 60);
        let s2 = db.start_session(app_id, time_35_days_ago).unwrap();
        db.end_session(s2, time_35_days_ago + 300).unwrap();

        let stats = db.get_weekly_stats().unwrap();
        assert_eq!(stats.len(), 1);
        assert_eq!(stats[0].1, 300);
    }
}
