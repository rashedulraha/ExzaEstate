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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MachineFingerprintPayload {
    pub machine_id: String,
    pub motherboard_uuid: String,
    pub cpu_serial: String,
    pub disk_serial: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LicenseVerificationRequestPayload {
    pub company_id: String,
    pub kid: String,
    pub machine_id: Option<String>,
    pub max_seats: u32,
    pub plan: String,
    pub valid_until: String,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LicenseVerificationResponsePayload {
    pub status: String, // ACTIVE, GRACE, EXPIRED, CLOCK_TAMPERED, INVALID
    pub is_write_locked: bool,
    pub can_export: bool,
    pub plan: String,
    pub max_seats: u32,
    pub valid_until: String,
    pub machine_id: Option<String>,
    pub message: Option<String>,
    pub days_remaining: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RenewalRequestPayload {
    pub machine_id: String,
    pub company_id: String,
    pub plan: String,
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

    #[test]
    fn test_licensing_payloads_serialization() {
        let fp = MachineFingerprintPayload {
            machine_id: "aabbccdd".to_string(),
            motherboard_uuid: "mb-uuid".to_string(),
            cpu_serial: "cpu-ser".to_string(),
            disk_serial: "disk-ser".to_string(),
        };
        let json_fp = serde_json::to_string(&fp).expect("FP serialize failed");
        let parsed_fp: MachineFingerprintPayload = serde_json::from_str(&json_fp).expect("FP deserialize failed");
        assert_eq!(fp, parsed_fp);

        let resp = LicenseVerificationResponsePayload {
            status: "ACTIVE".to_string(),
            is_write_locked: false,
            can_export: true,
            plan: "ENTERPRISE".to_string(),
            max_seats: 10,
            valid_until: "2027-01-01T00:00:00Z".to_string(),
            machine_id: Some("aabbccdd".to_string()),
            message: None,
            days_remaining: None,
        };
        let json_resp = serde_json::to_string(&resp).expect("Resp serialize failed");
        let parsed_resp: LicenseVerificationResponsePayload = serde_json::from_str(&json_resp).expect("Resp deserialize failed");
        assert_eq!(resp, parsed_resp);
    }
}
