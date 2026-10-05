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

/// Entry point for ExzaEstate Desktop application
pub fn run() {
    println!("ExzaEstate Desktop runtime initialized");
}
