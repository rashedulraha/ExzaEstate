use std::collections::HashMap;
use std::process::Command;
use base64::engine::general_purpose::{URL_SAFE, URL_SAFE_NO_PAD};
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const DEFAULT_KID: &str = "exza-ed25519-v1";
pub const CLOCK_TOLERANCE_SECONDS: i64 = 3600; // 1 hour tolerance for NTP / timezone shifts
pub const GRACE_PERIOD_SECONDS: i64 = 7 * 86400; // 7 days grace period per AT-31 & arch §12.8

/// Immutable hardware components queried from the host machine
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HardwareComponents {
    pub motherboard_uuid: String,
    pub cpu_serial: String,
    pub disk_serial: String,
}

impl HardwareComponents {
    pub fn new(motherboard_uuid: &str, cpu_serial: &str, disk_serial: &str) -> Self {
        Self {
            motherboard_uuid: motherboard_uuid.trim().to_string(),
            cpu_serial: cpu_serial.trim().to_string(),
            disk_serial: disk_serial.trim().to_string(),
        }
    }

    /// Queries the local operating system to gather immutable hardware identifiers.
    /// Falls back gracefully to system identifiers if specific commands fail.
    pub fn detect() -> Self {
        let motherboard_uuid = detect_motherboard_uuid();
        let cpu_serial = detect_cpu_serial();
        let disk_serial = detect_disk_serial();

        Self::new(&motherboard_uuid, &cpu_serial, &disk_serial)
    }

    /// Calculates a deterministic SHA-256 machine identifier.
    /// Format: SHA-256 of "motherboard_uuid:cpu_serial:disk_serial"
    pub fn compute_machine_id(&self) -> String {
        let canonical = format!(
            "{}:{}:{}",
            self.motherboard_uuid, self.cpu_serial, self.disk_serial
        );
        let mut hasher = Sha256::new();
        hasher.update(canonical.as_bytes());
        hex::encode(hasher.finalize())
    }
}

/// Tolerance calculation per Gate D-15 and Architecture §12.8:
/// Accepts when >= 2 of 3 components match (motherboard repair, disk upgrade, or CPU replacement).
pub fn calculate_hardware_match(comp1: &HardwareComponents, comp2: &HardwareComponents) -> usize {
    let mut score = 0;
    if !comp1.motherboard_uuid.is_empty() && comp1.motherboard_uuid == comp2.motherboard_uuid {
        score += 1;
    }
    if !comp1.cpu_serial.is_empty() && comp1.cpu_serial == comp2.cpu_serial {
        score += 1;
    }
    if !comp1.disk_serial.is_empty() && comp1.disk_serial == comp2.disk_serial {
        score += 1;
    }
    score
}

pub fn is_hardware_compatible(comp1: &HardwareComponents, comp2: &HardwareComponents) -> bool {
    calculate_hardware_match(comp1, comp2) >= 2
}

// OS-specific hardware detection helpers
fn detect_motherboard_uuid() -> String {
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                if line.contains("IOPlatformUUID") {
                    if let Some(uuid) = line.split('"').nth(3) {
                        return uuid.trim().to_string();
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(uuid) = std::fs::read_to_string("/sys/class/dmi/id/product_uuid") {
            let trimmed = uuid.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
        if let Ok(mid) = std::fs::read_to_string("/etc/machine-id") {
            let trimmed = mid.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("wmic")
            .args(["csproduct", "get", "uuid"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = text.lines().map(|s| s.trim()).filter(|s| !s.is_empty() && *s != "UUID").collect();
            if let Some(first) = lines.first() {
                return first.to_string();
            }
        }
    }

    // Monotonic fallback
    std::env::var("EXZA_MOCK_MB_UUID").unwrap_or_else(|_| "MB-DEFAULT-SYS-001".to_string())
}

fn detect_cpu_serial() -> String {
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("sysctl")
            .args(["-n", "machdep.cpu.brand_string"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !text.is_empty() {
                return text;
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(text) = std::fs::read_to_string("/proc/cpuinfo") {
            for line in text.lines() {
                if line.starts_with("model name") || line.starts_with("Serial") {
                    if let Some(val) = line.split(':').nth(1) {
                        return val.trim().to_string();
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("wmic")
            .args(["cpu", "get", "processorid"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = text.lines().map(|s| s.trim()).filter(|s| !s.is_empty() && *s != "ProcessorId").collect();
            if let Some(first) = lines.first() {
                return first.to_string();
            }
        }
    }

    std::env::var("EXZA_MOCK_CPU_SERIAL").unwrap_or_else(|_| "CPU-DEFAULT-GEN-001".to_string())
}

fn detect_disk_serial() -> String {
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("diskutil")
            .args(["info", "/"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                if line.contains("Volume UUID") || line.contains("Disk / Partition UUID") {
                    if let Some(val) = line.split(':').nth(1) {
                        return val.trim().to_string();
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(serial) = std::fs::read_to_string("/sys/block/sda/device/serial") {
            let trimmed = serial.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("wmic")
            .args(["diskdrive", "get", "serialnumber"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = text.lines().map(|s| s.trim()).filter(|s| !s.is_empty() && *s != "SerialNumber").collect();
            if let Some(first) = lines.first() {
                return first.to_string();
            }
        }
    }

    std::env::var("EXZA_MOCK_DISK_SERIAL").unwrap_or_else(|_| "DISK-DEFAULT-PRIMARY-001".to_string())
}

/// Offline License Payload structure matching the NestJS backend
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LicensePayload {
    pub company_id: String,
    pub kid: String,
    pub machine_id: Option<String>,
    pub max_seats: u32,
    pub plan: String,
    pub valid_until: String,
}

impl LicensePayload {
    /// Serializes canonical JSON matching Node.js JSON.stringify exactly:
    /// {"company_id":"...","kid":"...","machine_id":.../null,"max_seats":...,"plan":"...","valid_until":"..."}
    pub fn to_canonical_json(&self) -> String {
        let machine_str = match &self.machine_id {
            Some(m) => format!("\"{}\"", m),
            None => "null".to_string(),
        };

        format!(
            "{{\"company_id\":\"{}\",\"kid\":\"{}\",\"machine_id\":{},\"max_seats\":{},\"plan\":\"{}\",\"valid_until\":\"{}\"}}",
            self.company_id,
            self.kid,
            machine_str,
            self.max_seats,
            self.plan,
            self.valid_until
        )
    }
}

/// KeySet storing trusted Ed25519 public keys mapped by `kid`
#[derive(Debug, Clone)]
pub struct KeySet {
    keys: HashMap<String, [u8; 32]>,
}

impl KeySet {
    pub fn new() -> Self {
        Self {
            keys: HashMap::new(),
        }
    }

    pub fn insert(&mut self, kid: &str, public_key: [u8; 32]) {
        self.keys.insert(kid.to_string(), public_key);
    }

    pub fn get(&self, kid: &str) -> Option<&[u8; 32]> {
        self.keys.get(kid)
    }
}

impl Default for KeySet {
    fn default() -> Self {
        let mut set = Self::new();
        // Embedded default public key for standard production/staging builds
        // Can be extended with rotation keys
        set.insert(DEFAULT_KID, [0u8; 32]);
        set
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "status", content = "details")]
pub enum LicenseState {
    Active,
    Grace { days_remaining: u32 },
    Expired,
    ClockTampered { message: String },
    Invalid { reason: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseEvaluation {
    pub state: LicenseState,
    pub is_write_locked: bool,
    pub can_export: bool,
    pub plan: String,
    pub max_seats: u32,
    pub valid_until: String,
    pub machine_id: Option<String>,
}

/// Verifies Ed25519 signature over canonical license payload
pub fn verify_license_signature(
    payload: &LicensePayload,
    signature_base64: &str,
    public_key_bytes: &[u8; 32],
) -> Result<bool, String> {
    let sig_bytes = URL_SAFE_NO_PAD
        .decode(signature_base64)
        .or_else(|_| URL_SAFE.decode(signature_base64))
        .map_err(|e| format!("Base64 decode signature failed: {}", e))?;

    if sig_bytes.len() != 64 {
        return Err(format!("Invalid signature length: expected 64, got {}", sig_bytes.len()));
    }

    let verifying_key = VerifyingKey::from_bytes(public_key_bytes)
        .map_err(|e| format!("Invalid public key: {}", e))?;

    let signature = Signature::from_slice(&sig_bytes)
        .map_err(|e| format!("Invalid signature format: {}", e))?;

    let canonical_data = payload.to_canonical_json();
    match verifying_key.verify(canonical_data.as_bytes(), &signature) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Anti-Clock-Tampering Guard (Clock Rollback Defense)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClockGuard {
    pub high_water_mark: i64,
}

impl ClockGuard {
    pub fn new(initial_timestamp: i64) -> Self {
        Self {
            high_water_mark: initial_timestamp,
        }
    }

    /// Checks if current_time has been rolled back before the recorded high-water mark.
    /// Allows a 1-hour buffer for NTP and timezone adjustments.
    pub fn evaluate_time(&mut self, current_time: i64) -> Result<(), String> {
        if current_time < self.high_water_mark - CLOCK_TOLERANCE_SECONDS {
            return Err(format!(
                "CLOCK_TAMPERED: system clock (epoch {}) moved backward relative to high-water mark (epoch {})",
                current_time, self.high_water_mark
            ));
        }

        if current_time > self.high_water_mark {
            self.high_water_mark = current_time;
        }

        Ok(())
    }
}

/// Machine-specific Renewal Request Code generator (alphanumeric with checksum)
pub fn generate_renewal_request_code(
    machine_id: &str,
    company_id: &str,
    plan: &str,
) -> String {
    let raw = format!("{}:{}:{}", machine_id, company_id, plan);
    let mut hasher = Sha256::new();
    hasher.update(raw.as_bytes());
    let hash = hex::encode(hasher.finalize());

    let m_short = if machine_id.len() >= 8 { &machine_id[..8] } else { machine_id };
    let c_short = if company_id.len() >= 8 { &company_id[..8] } else { company_id };
    let checksum = &hash[..6];

    format!("EXZA-REQ-{}-{}-{}-{}", m_short.to_uppercase(), c_short.to_uppercase(), plan.to_uppercase(), checksum.to_uppercase())
}

/// Comprehensive License Evaluator
pub fn evaluate_license(
    payload: &LicensePayload,
    signature_base64: &str,
    public_key_bytes: &[u8; 32],
    current_hardware: &HardwareComponents,
    clock_guard: &mut ClockGuard,
    current_time: i64,
    valid_until_timestamp: i64,
) -> LicenseEvaluation {
    // 1. Clock Tampering Check
    if let Err(msg) = clock_guard.evaluate_time(current_time) {
        return LicenseEvaluation {
            state: LicenseState::ClockTampered { message: msg },
            is_write_locked: true,
            can_export: true, // BR-20: data never held hostage
            plan: payload.plan.clone(),
            max_seats: payload.max_seats,
            valid_until: payload.valid_until.clone(),
            machine_id: payload.machine_id.clone(),
        };
    }

    // 2. Cryptographic Signature Check
    match verify_license_signature(payload, signature_base64, public_key_bytes) {
        Ok(true) => {}
        Ok(false) => {
            return LicenseEvaluation {
                state: LicenseState::Invalid {
                    reason: "Cryptographic signature mismatch or corrupted license".to_string(),
                },
                is_write_locked: true,
                can_export: true,
                plan: payload.plan.clone(),
                max_seats: payload.max_seats,
                valid_until: payload.valid_until.clone(),
                machine_id: payload.machine_id.clone(),
            };
        }
        Err(e) => {
            return LicenseEvaluation {
                state: LicenseState::Invalid {
                    reason: format!("Signature verification error: {}", e),
                },
                is_write_locked: true,
                can_export: true,
                plan: payload.plan.clone(),
                max_seats: payload.max_seats,
                valid_until: payload.valid_until.clone(),
                machine_id: payload.machine_id.clone(),
            };
        }
    }

    // 3. Machine ID & Hardware Binding Check
    if let Some(target_machine_id) = &payload.machine_id {
        let current_machine_id = current_hardware.compute_machine_id();
        if target_machine_id != &current_machine_id {
            return LicenseEvaluation {
                state: LicenseState::Invalid {
                    reason: format!(
                        "Hardware binding mismatch: expected machine {} but detected {}",
                        target_machine_id, current_machine_id
                    ),
                },
                is_write_locked: true,
                can_export: true,
                plan: payload.plan.clone(),
                max_seats: payload.max_seats,
                valid_until: payload.valid_until.clone(),
                machine_id: payload.machine_id.clone(),
            };
        }
    }

    // 4. Temporal Validity & Grace Period Check
    if current_time <= valid_until_timestamp {
        LicenseEvaluation {
            state: LicenseState::Active,
            is_write_locked: false,
            can_export: true,
            plan: payload.plan.clone(),
            max_seats: payload.max_seats,
            valid_until: payload.valid_until.clone(),
            machine_id: payload.machine_id.clone(),
        }
    } else if current_time <= valid_until_timestamp + GRACE_PERIOD_SECONDS {
        let remaining_seconds = (valid_until_timestamp + GRACE_PERIOD_SECONDS) - current_time;
        let days_remaining = ((remaining_seconds + 86399) / 86400) as u32;

        LicenseEvaluation {
            state: LicenseState::Grace { days_remaining },
            is_write_locked: false, // In grace period, writes still permitted
            can_export: true,
            plan: payload.plan.clone(),
            max_seats: payload.max_seats,
            valid_until: payload.valid_until.clone(),
            machine_id: payload.machine_id.clone(),
        }
    } else {
        LicenseEvaluation {
            state: LicenseState::Expired,
            is_write_locked: true, // Past grace period: write-locked
            can_export: true,      // Data export remains accessible
            plan: payload.plan.clone(),
            max_seats: payload.max_seats,
            valid_until: payload.valid_until.clone(),
            machine_id: payload.machine_id.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    #[test]
    fn test_machine_fingerprint_deterministic() {
        let comp1 = HardwareComponents::new("MB-12345", "CPU-9999", "DISK-5555");
        let comp2 = HardwareComponents::new("MB-12345", "CPU-9999", "DISK-5555");
        assert_eq!(comp1.compute_machine_id(), comp2.compute_machine_id());
        assert_eq!(comp1.compute_machine_id().len(), 64);
    }

    #[test]
    fn test_hardware_tolerance_gate_d15() {
        let base = HardwareComponents::new("MB-UUID-1", "CPU-SER-1", "DISK-SER-1");
        
        // 3 of 3 match
        let comp_all = HardwareComponents::new("MB-UUID-1", "CPU-SER-1", "DISK-SER-1");
        assert_eq!(calculate_hardware_match(&base, &comp_all), 3);
        assert!(is_hardware_compatible(&base, &comp_all));

        // 2 of 3 match (e.g. disk replaced)
        let comp_disk_swapped = HardwareComponents::new("MB-UUID-1", "CPU-SER-1", "DISK-NEW-2");
        assert_eq!(calculate_hardware_match(&base, &comp_disk_swapped), 2);
        assert!(is_hardware_compatible(&base, &comp_disk_swapped));

        // 1 of 3 match (e.g. copied to totally different laptop)
        let comp_copied = HardwareComponents::new("MB-DIFF-2", "CPU-DIFF-2", "DISK-SER-1");
        assert_eq!(calculate_hardware_match(&base, &comp_copied), 1);
        assert!(!is_hardware_compatible(&base, &comp_copied));

        // 0 of 3 match
        let comp_foreign = HardwareComponents::new("MB-OTHER", "CPU-OTHER", "DISK-OTHER");
        assert_eq!(calculate_hardware_match(&base, &comp_foreign), 0);
        assert!(!is_hardware_compatible(&base, &comp_foreign));
    }

    #[test]
    fn test_ed25519_signature_verification_and_tampering() {
        // Deterministic test keypair using 32 bytes seed
        let seed = [42u8; 32];
        let signing_key = SigningKey::from_bytes(&seed);
        let verifying_key = signing_key.verifying_key();
        let pub_bytes = verifying_key.to_bytes();

        let payload = LicensePayload {
            company_id: "company-uuid-001".to_string(),
            kid: DEFAULT_KID.to_string(),
            machine_id: Some("machine-id-abc".to_string()),
            max_seats: 10,
            plan: "ENTERPRISE".to_string(),
            valid_until: "2027-01-01T00:00:00Z".to_string(),
        };

        // Sign canonical JSON
        let canonical = payload.to_canonical_json();
        let sig = signing_key.sign(canonical.as_bytes());
        let sig_b64 = URL_SAFE_NO_PAD.encode(sig.to_bytes());

        // 1. Untampered payload verifies
        let res = verify_license_signature(&payload, &sig_b64, &pub_bytes);
        assert_eq!(res, Ok(true));

        // 2. Tampering valid_until fails verification
        let mut tampered_date = payload.clone();
        tampered_date.valid_until = "2029-01-01T00:00:00Z".to_string();
        let res_tampered_date = verify_license_signature(&tampered_date, &sig_b64, &pub_bytes);
        assert_eq!(res_tampered_date, Ok(false));

        // 3. Tampering max_seats fails verification
        let mut tampered_seats = payload.clone();
        tampered_seats.max_seats = 999;
        let res_tampered_seats = verify_license_signature(&tampered_seats, &sig_b64, &pub_bytes);
        assert_eq!(res_tampered_seats, Ok(false));

        // 4. Tampering company_id fails verification
        let mut tampered_company = payload.clone();
        tampered_company.company_id = "company-other-999".to_string();
        let res_tampered_company = verify_license_signature(&tampered_company, &sig_b64, &pub_bytes);
        assert_eq!(res_tampered_company, Ok(false));
    }

    #[test]
    fn test_clock_tampering_defense() {
        let initial_epoch = 1770000000;
        let mut guard = ClockGuard::new(initial_epoch);

        // Normal advancement
        assert!(guard.evaluate_time(initial_epoch + 100).is_ok());
        assert_eq!(guard.high_water_mark, initial_epoch + 100);

        // Minor backward drift within tolerance (e.g. 5 minutes NTP sync)
        assert!(guard.evaluate_time(guard.high_water_mark - 300).is_ok());

        // Extreme backward jump (> 1 hour) triggers CLOCK_TAMPERED
        let tamper_res = guard.evaluate_time(guard.high_water_mark - 4000);
        assert!(tamper_res.is_err());
        assert!(tamper_res.unwrap_err().contains("CLOCK_TAMPERED"));
    }

    #[test]
    fn test_full_license_evaluation_states() {
        let seed = [7u8; 32];
        let signing_key = SigningKey::from_bytes(&seed);
        let verifying_key = signing_key.verifying_key();
        let pub_bytes = verifying_key.to_bytes();

        let hardware = HardwareComponents::new("MB-1", "CPU-1", "DISK-1");
        let machine_id = hardware.compute_machine_id();

        let payload = LicensePayload {
            company_id: "comp-1".to_string(),
            kid: DEFAULT_KID.to_string(),
            machine_id: Some(machine_id.clone()),
            max_seats: 5,
            plan: "PRO".to_string(),
            valid_until: "2026-10-01T00:00:00Z".to_string(),
        };

        let sig = signing_key.sign(payload.to_canonical_json().as_bytes());
        let sig_b64 = URL_SAFE_NO_PAD.encode(sig.to_bytes());

        let valid_until_epoch = 1790812800; // e.g. Oct 1, 2026

        // Case 1: Active
        let mut guard = ClockGuard::new(valid_until_epoch - 86400);
        let eval_active = evaluate_license(
            &payload,
            &sig_b64,
            &pub_bytes,
            &hardware,
            &mut guard,
            valid_until_epoch - 86400,
            valid_until_epoch,
        );
        assert_eq!(eval_active.state, LicenseState::Active);
        assert!(!eval_active.is_write_locked);
        assert!(eval_active.can_export);

        // Case 2: Grace period (2 days after valid_until)
        let eval_grace = evaluate_license(
            &payload,
            &sig_b64,
            &pub_bytes,
            &hardware,
            &mut guard,
            valid_until_epoch + (2 * 86400),
            valid_until_epoch,
        );
        match eval_grace.state {
            LicenseState::Grace { days_remaining } => assert_eq!(days_remaining, 5),
            _ => panic!("Expected Grace state"),
        }
        assert!(!eval_grace.is_write_locked);
        assert!(eval_grace.can_export);

        // Case 3: Expired (10 days after valid_until, past 7d grace)
        let eval_expired = evaluate_license(
            &payload,
            &sig_b64,
            &pub_bytes,
            &hardware,
            &mut guard,
            valid_until_epoch + (10 * 86400),
            valid_until_epoch,
        );
        assert_eq!(eval_expired.state, LicenseState::Expired);
        assert!(eval_expired.is_write_locked); // Writes locked
        assert!(eval_expired.can_export); // Reads and export ALWAYS allowed (BR-20)

        // Case 4: Machine mismatch
        let foreign_hw = HardwareComponents::new("MB-FOREIGN", "CPU-FOREIGN", "DISK-FOREIGN");
        let mut guard_mismatch = ClockGuard::new(valid_until_epoch - 200);
        let eval_mismatch = evaluate_license(
            &payload,
            &sig_b64,
            &pub_bytes,
            &foreign_hw,
            &mut guard_mismatch,
            valid_until_epoch - 100,
            valid_until_epoch,
        );
        match eval_mismatch.state {
            LicenseState::Invalid { reason } => assert!(reason.contains("Hardware binding mismatch")),
            _ => panic!("Expected Invalid state"),
        }
        assert!(eval_mismatch.is_write_locked);
        assert!(eval_mismatch.can_export);
    }

    #[test]
    fn test_renewal_request_code_generation() {
        let code = generate_renewal_request_code("A1B2C3D4E5F6", "COMPANY-UUID-1234", "ENTERPRISE");
        assert!(code.starts_with("EXZA-REQ-A1B2C3D4-COMPANY--ENTERPRISE-"));
    }
}
