use std::net::TcpListener;

/// Finds a free loopback port on 127.0.0.1.
/// If preferred_port is available, it is returned. Otherwise, OS assigns a free ephemeral port.
pub fn find_free_loopback_port(preferred_port: u16) -> Result<u16, std::io::Error> {
    if preferred_port > 0 && is_port_available(preferred_port) {
        return Ok(preferred_port);
    }

    let listener = TcpListener::bind(("127.0.0.1", 0))?;
    let port = listener.local_addr()?.port();
    drop(listener);
    Ok(port)
}

/// Checks whether a given TCP port is available for binding on 127.0.0.1
pub fn is_port_available(port: u16) -> bool {
    match TcpListener::bind(("127.0.0.1", port)) {
        Ok(listener) => {
            drop(listener);
            true
        }
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_free_loopback_port_returns_valid_port() {
        let port = find_free_loopback_port(0).expect("Should find a free loopback port");
        assert!(port > 1024, "Port should be an unprivileged ephemeral port");
        assert!(is_port_available(port), "Found port should be available");
    }

    #[test]
    fn test_preferred_port_used_if_available() {
        // Find an available port first
        let free_port = find_free_loopback_port(0).expect("Should find port");
        let chosen = find_free_loopback_port(free_port).expect("Should succeed");
        assert_eq!(chosen, free_port);
    }

    #[test]
    fn test_port_occupied_returns_false() {
        let listener = TcpListener::bind(("127.0.0.1", 0)).expect("Bind failed");
        let port = listener.local_addr().unwrap().port();
        assert!(!is_port_available(port), "Occupied port must not be available");
    }
}
