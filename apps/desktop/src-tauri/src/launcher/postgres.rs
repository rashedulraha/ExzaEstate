use std::fs;
use std::path::PathBuf;
use std::process::Command;

/// Local PostgreSQL manager for standalone offline desktop mode (Task B9 S2).
/// Manages pgdata path resolution and stale `postmaster.pid` cleanup after improper shutdowns.
#[derive(Debug, Clone)]
pub struct LocalPostgresManager {
    pub data_dir: PathBuf,
    pub port: u16,
}

impl LocalPostgresManager {
    pub fn new(data_dir: PathBuf, port: u16) -> Self {
        Self { data_dir, port }
    }

    /// Path to `postmaster.pid` lockfile within the database directory
    pub fn pid_file_path(&self) -> PathBuf {
        self.data_dir.join("postmaster.pid")
    }

    /// Checks if a process with the given PID is currently active.
    pub fn is_pid_active(pid: u32) -> bool {
        #[cfg(unix)]
        {
            let status = Command::new("kill")
                .arg("-0")
                .arg(pid.to_string())
                .status();
            match status {
                Ok(s) => s.success(),
                Err(_) => false,
            }
        }
        #[cfg(not(unix))]
        {
            let output = Command::new("tasklist")
                .arg("/FI")
                .arg(format!("PID eq {}", pid))
                .output();
            match output {
                Ok(out) => {
                    let text = String::from_utf8_lossy(&out.stdout);
                    text.contains(&pid.to_string())
                }
                Err(_) => false,
            }
        }
    }

    /// Inspects `postmaster.pid`. If present and the PID is no longer running on the host OS,
    /// it removes the stale lockfile so that embedded PostgreSQL can start cleanly.
    /// Returns:
    /// - `Ok(true)` if a stale lockfile was detected and cleaned up.
    /// - `Ok(false)` if no lockfile existed, or if it is already clean.
    /// - `Err(msg)` if an active postgres process is holding the directory.
    pub fn handle_stale_pid(&self) -> Result<bool, String> {
        let pid_path = self.pid_file_path();
        if !pid_path.exists() {
            return Ok(false);
        }

        let content = fs::read_to_string(&pid_path)
            .map_err(|e| format!("Failed to read postmaster.pid: {}", e))?;

        // First line of postmaster.pid is the PID integer
        let first_line = content.lines().next().unwrap_or("").trim();
        let pid: u32 = first_line
            .parse()
            .map_err(|_| "Malformed postmaster.pid: first line is not a valid PID".to_string())?;

        if Self::is_pid_active(pid) {
            return Err(format!(
                "An active PostgreSQL instance (PID {}) is already using data directory: {}",
                pid,
                self.data_dir.display()
            ));
        }

        // Process is dead: remove stale lockfile
        fs::remove_file(&pid_path)
            .map_err(|e| format!("Failed to remove stale postmaster.pid: {}", e))?;

        Ok(true)
    }

    /// Formats the local database connection URL with loopback IP and port
    pub fn get_connection_url(&self) -> String {
        format!(
            "postgresql://postgres:postgres@127.0.0.1:{}/exzaestate_local?schema=public",
            self.port
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_no_pid_file_returns_ok_false() {
        let temp_dir = env::temp_dir().join(format!("exza_test_pg_{}", std::process::id()));
        let _ = fs::create_dir_all(&temp_dir);

        let mgr = LocalPostgresManager::new(temp_dir.clone(), 54321);
        let result = mgr.handle_stale_pid();
        assert_eq!(result, Ok(false));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_stale_pid_cleanup() {
        let temp_dir = env::temp_dir().join(format!("exza_stale_pg_{}", std::process::id()));
        let _ = fs::create_dir_all(&temp_dir);

        // Write a PID that is almost certainly dead (e.g. 999999)
        let pid_file = temp_dir.join("postmaster.pid");
        fs::write(&pid_file, "999999\n/tmp\n12345\n").expect("Write failed");

        let mgr = LocalPostgresManager::new(temp_dir.clone(), 54321);
        let cleaned = mgr.handle_stale_pid().expect("Cleanup should succeed");
        assert!(cleaned, "Stale PID should have been reported as cleaned");
        assert!(!pid_file.exists(), "Stale postmaster.pid file should be deleted");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_active_pid_returns_error() {
        let temp_dir = env::temp_dir().join(format!("exza_active_pg_{}", std::process::id()));
        let _ = fs::create_dir_all(&temp_dir);

        // Write our OWN current running process PID
        let our_pid = std::process::id();
        let pid_file = temp_dir.join("postmaster.pid");
        fs::write(&pid_file, format!("{}\n/tmp\n12345\n", our_pid)).expect("Write failed");

        let mgr = LocalPostgresManager::new(temp_dir.clone(), 54321);
        let result = mgr.handle_stale_pid();
        assert!(result.is_err(), "Active PID must return an error refusing takeover");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_connection_url_formatting() {
        let mgr = LocalPostgresManager::new(PathBuf::from("/data"), 15432);
        assert_eq!(
            mgr.get_connection_url(),
            "postgresql://postgres:postgres@127.0.0.1:15432/exzaestate_local?schema=public"
        );
    }
}
