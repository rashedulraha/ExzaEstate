pub mod commands;
pub mod launcher;
pub mod platform;

pub use commands::{
    get_app_data_dir, get_log_dir, ApiConfigPayload, LicenseVerificationRequestPayload,
    LicenseVerificationResponsePayload, MachineFingerprintPayload, RenewalRequestPayload,
    SidecarStatusPayload,
};
pub use launcher::{
    find_free_loopback_port, generate_256bit_secret, is_port_available, LocalPostgresManager,
    SidecarManager, SidecarState, SidecarStatus, SingleInstanceGuard,
};
pub use platform::licensing::{
    calculate_hardware_match, evaluate_license, generate_renewal_request_code,
    is_hardware_compatible, ClockGuard, HardwareComponents, KeySet, LicenseEvaluation,
    LicensePayload, LicenseState, DEFAULT_KID,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
