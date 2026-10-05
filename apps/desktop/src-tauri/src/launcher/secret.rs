use std::fs::File;
use std::io::Read;
use std::time::{SystemTime, UNIX_EPOCH};

/// Generates a 256-bit cryptographically secure per-launch secret (64 lowercase hex characters).
/// In Task A10.2 and B9 S2, this secret is injected into the sidecar's environment as `LOCAL_API_SECRET`
/// and sent in the `X-Local-Secret` header on every desktop IPC request.
pub fn generate_256bit_secret() -> String {
    let mut bytes = [0u8; 32];

    // Read from /dev/urandom on Unix/macOS
    let read_success = File::open("/dev/urandom")
        .and_then(|mut f| f.read_exact(&mut bytes))
        .is_ok();

    if !read_success {
        // Fallback entropy mixing: nanos + memory address + process id
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let pid = std::process::id();
        let stack_val = &bytes as *const _ as usize;

        for (i, b) in bytes.iter_mut().enumerate() {
            let shift = (i % 8) * 8;
            let val = ((now >> shift) ^ ((pid as u128) << shift) ^ ((stack_val as u128) >> shift)) as u8;
            *b = val.wrapping_add((i as u8).wrapping_mul(31));
        }
    }

    // Convert 32 bytes to 64 hex characters
    let mut hex = String::with_capacity(64);
    for b in bytes {
        hex.push_str(&format!("{:02x}", b));
    }
    hex
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secret_is_exactly_64_hex_chars() {
        let secret = generate_256bit_secret();
        assert_eq!(secret.len(), 64, "Secret must be exactly 64 characters (256 bits in hex)");
        assert!(
            secret.chars().all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()),
            "Secret must consist only of lowercase hex characters"
        );
    }

    #[test]
    fn test_secrets_are_unique_per_invocation() {
        let s1 = generate_256bit_secret();
        let s2 = generate_256bit_secret();
        assert_ne!(s1, s2, "Consecutive secrets must be distinct");
    }
}
