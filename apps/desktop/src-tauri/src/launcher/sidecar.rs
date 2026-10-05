use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Duration;

pub const MAX_RESTART_ATTEMPTS: u32 = 3;
pub const HEALTH_TIMEOUT_SECS: u64 = 30;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SidecarState {
    Stopped,
    Starting,
    Running { port: u16, pid: u32 },
    Degraded { attempts: u32, error: String },
    Failed { error: String, log_dir: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SidecarStatus {
    pub running: bool,
    pub port: Option<u16>,
    pub error: Option<String>,
    pub restart_count: u32,
    pub log_dir: String,
}

pub struct SidecarManager {
    pub port: u16,
    pub secret: String,
    pub restart_count: u32,
    pub max_restarts: u32,
    pub state: SidecarState,
    pub log_dir: PathBuf,
}

impl SidecarManager {
    pub fn new(port: u16, secret: String, base_data_dir: &Path) -> Self {
        let log_dir = base_data_dir.join("logs");
        Self {
            port,
            secret,
            restart_count: 0,
            max_restarts: MAX_RESTART_ATTEMPTS,
            state: SidecarState::Stopped,
            log_dir,
        }
    }

    /// Computes exponential backoff delay based on attempt number (Task B9 S3):
    /// Attempt 1: 1s, Attempt 2: 2s, Attempt 3: 4s.
    pub fn compute_backoff(attempt: u32) -> Duration {
        match attempt {
            0 | 1 => Duration::from_secs(1),
            2 => Duration::from_secs(2),
            _ => Duration::from_secs(4),
        }
    }

    /// Checks if another restart can be attempted
    pub fn can_restart(&self) -> bool {
        self.restart_count < self.max_restarts
    }

    /// Records a crash event. If retries remain, returns backoff duration.
    /// If retries exhausted, marks status as Failed with log directory link.
    pub fn handle_crash(&mut self, err: String) -> Result<Duration, String> {
        self.restart_count += 1;
        if self.restart_count <= self.max_restarts {
            let backoff = Self::compute_backoff(self.restart_count);
            self.state = SidecarState::Degraded {
                attempts: self.restart_count,
                error: err,
            };
            Ok(backoff)
        } else {
            let log_dir_str = self.log_dir.to_string_lossy().to_string();
            self.state = SidecarState::Failed {
                error: format!("Sidecar crashed {} times: {}", self.max_restarts, err),
                log_dir: log_dir_str,
            };
            Err(format!(
                "Sidecar failed after {} restart attempts. Check logs at: {}",
                self.max_restarts,
                self.log_dir.display()
            ))
        }
    }

    /// Returns current client status DTO
    pub fn get_status(&self) -> SidecarStatus {
        match &self.state {
            SidecarState::Running { port, .. } => SidecarStatus {
                running: true,
                port: Some(*port),
                error: None,
                restart_count: self.restart_count,
                log_dir: self.log_dir.to_string_lossy().to_string(),
            },
            SidecarState::Starting => SidecarStatus {
                running: false,
                port: Some(self.port),
                error: None,
                restart_count: self.restart_count,
                log_dir: self.log_dir.to_string_lossy().to_string(),
            },
            SidecarState::Degraded { error, .. } => SidecarStatus {
                running: false,
                port: Some(self.port),
                error: Some(error.clone()),
                restart_count: self.restart_count,
                log_dir: self.log_dir.to_string_lossy().to_string(),
            },
            SidecarState::Failed { error, .. } => SidecarStatus {
                running: false,
                port: None,
                error: Some(error.clone()),
                restart_count: self.restart_count,
                log_dir: self.log_dir.to_string_lossy().to_string(),
            },
            SidecarState::Stopped => SidecarStatus {
                running: false,
                port: None,
                error: None,
                restart_count: self.restart_count,
                log_dir: self.log_dir.to_string_lossy().to_string(),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backoff_durations() {
        assert_eq!(SidecarManager::compute_backoff(1), Duration::from_secs(1));
        assert_eq!(SidecarManager::compute_backoff(2), Duration::from_secs(2));
        assert_eq!(SidecarManager::compute_backoff(3), Duration::from_secs(4));
        assert_eq!(SidecarManager::compute_backoff(4), Duration::from_secs(4));
    }

    #[test]
    fn test_restart_lifecycle_max_3_attempts() {
        let mut mgr = SidecarManager::new(14201, "secret".to_string(), Path::new("/data"));
        assert!(mgr.can_restart());

        // Attempt 1
        let b1 = mgr.handle_crash("Err 1".to_string()).expect("Should backoff");
        assert_eq!(b1, Duration::from_secs(1));
        assert_eq!(mgr.restart_count, 1);

        // Attempt 2
        let b2 = mgr.handle_crash("Err 2".to_string()).expect("Should backoff");
        assert_eq!(b2, Duration::from_secs(2));
        assert_eq!(mgr.restart_count, 2);

        // Attempt 3
        let b3 = mgr.handle_crash("Err 3".to_string()).expect("Should backoff");
        assert_eq!(b3, Duration::from_secs(4));
        assert_eq!(mgr.restart_count, 3);

        // Attempt 4 -> Fails
        let res4 = mgr.handle_crash("Err 4".to_string());
        assert!(res4.is_err(), "Must reject restart beyond 3 attempts");
        assert!(!mgr.can_restart());

        let status = mgr.get_status();
        assert!(!status.running);
        assert!(status.error.unwrap().contains("crashed 3 times"));
    }
}
