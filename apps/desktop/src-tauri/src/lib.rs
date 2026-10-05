pub mod commands;
pub mod launcher;

pub use commands::{get_app_data_dir, get_log_dir, ApiConfigPayload, SidecarStatusPayload};
pub use launcher::{
    find_free_loopback_port, generate_256bit_secret, is_port_available, LocalPostgresManager,
    SidecarManager, SidecarState, SidecarStatus, SingleInstanceGuard,
};

/// Entry point for ExzaEstate Desktop application
pub fn run() {
    println!("ExzaEstate Desktop runtime initialized");
}
