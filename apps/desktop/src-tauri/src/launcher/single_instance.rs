use std::fs::{File, OpenOptions};
use std::path::{Path, PathBuf};
#[cfg(unix)]
use std::os::unix::io::AsRawFd;

/// Enforces that only a single instance of ExzaEstate can access a given data directory at a time.
/// Per `architecture.md` §20.3 & Acceptance AT-34:
/// "The single-instance refuses a second instance (two instances on one data directory would corrupt it)."
pub struct SingleInstanceGuard {
    _file: File,
    pub lock_path: PathBuf,
}

impl SingleInstanceGuard {
    pub fn acquire(data_dir: &Path) -> Result<Self, String> {
        let lock_path = data_dir.join("exzaestate.lock");

        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&lock_path)
            .map_err(|e| format!("Failed to open lockfile {}: {}", lock_path.display(), e))?;

        #[cfg(unix)]
        {
            let fd = file.as_raw_fd();
            // Try to acquire non-blocking exclusive lock
            let res = unsafe { libc::flock(fd, libc::LOCK_EX | libc::LOCK_NB) };
            if res != 0 {
                return Err(format!(
                    "Another instance of ExzaEstate is already running on data directory: {}",
                    data_dir.display()
                ));
            }
        }

        Ok(Self {
            _file: file,
            lock_path,
        })
    }
}

impl Drop for SingleInstanceGuard {
    fn drop(&mut self) {
        #[cfg(unix)]
        {
            let fd = self._file.as_raw_fd();
            unsafe {
                libc::flock(fd, libc::LOCK_UN);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::fs;

    #[test]
    fn test_single_instance_acquisition_and_release() {
        let temp_dir = env::temp_dir().join(format!("exza_single_test_{}", std::process::id()));
        let _ = fs::create_dir_all(&temp_dir);

        {
            let guard1 = SingleInstanceGuard::acquire(&temp_dir)
                .expect("First acquisition must succeed");
            assert!(guard1.lock_path.exists());

            // Second acquisition on the same path must fail
            let guard2_res = SingleInstanceGuard::acquire(&temp_dir);
            assert!(
                guard2_res.is_err(),
                "Second acquisition while guard1 is held must fail"
            );
        } // guard1 dropped here

        // Now third acquisition should succeed because guard1 was dropped
        let guard3 = SingleInstanceGuard::acquire(&temp_dir)
            .expect("Acquisition after release must succeed");
        drop(guard3);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
