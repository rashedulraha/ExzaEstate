use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ApiConfigPayload {
    pub base_url: String,
    pub runtime_mode: String,
    pub local_secret: Option<String>,
    pub client_type: String,
    pub client_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SidecarStatusPayload {
    pub running: bool,
    pub port: Option<u16>,
    pub error: Option<String>,
    pub restart_count: u32,
    pub log_dir: String,
}

/// Resolves standard OS data directory for ExzaEstate (`AppData/ExzaEstate` or `~/Library/Application Support/ExzaEstate`)
pub fn get_app_data_dir() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            return PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("ExzaEstate");
        }
    }
    #[cfg(target_os = "windows")]
    {
        if let Some(appdata) = std::env::var_os("APPDATA") {
            return PathBuf::from(appdata).join("ExzaEstate");
        }
    }
    #[cfg(target_os = "linux")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            return PathBuf::from(home).join(".local").join("share").join("exzaestate");
        }
    }
    std::env::temp_dir().join("ExzaEstate")
}

/// Returns log directory path
pub fn get_log_dir() -> PathBuf {
    get_app_data_dir().join("logs")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_config_serialization() {
        let config = ApiConfigPayload {
            base_url: "http://127.0.0.1:14201".to_string(),
            runtime_mode: "local".to_string(),
            local_secret: Some("abc123456789".to_string()),
            client_type: "desktop".to_string(),
            client_version: "0.1.0".to_string(),
        };

        let json = serde_json::to_string(&config).expect("Serialization failed");
        let parsed: ApiConfigPayload = serde_json::from_str(&json).expect("Deserialization failed");
        assert_eq!(config, parsed);
    }

    #[test]
    fn test_sidecar_status_serialization() {
        let status = SidecarStatusPayload {
            running: true,
            port: Some(14201),
            error: None,
            restart_count: 0,
            log_dir: "/path/to/logs".to_string(),
        };

        let json = serde_json::to_string(&status).expect("Serialization failed");
        let parsed: SidecarStatusPayload = serde_json::from_str(&json).expect("Deserialization failed");
        assert_eq!(status, parsed);
    }
}
