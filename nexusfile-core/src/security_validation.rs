use std::path::Path;

pub struct SecurityValidator;

impl SecurityValidator {
    pub const PROTECTED_SYSTEM_PATHS: &'static [&'static str] = &[
        "C:\\Windows",
        "C:\\Program Files",
        "C:\\Program Files (x86)",
        "C:\\ProgramData",
        "C:\\Windows\\System32",
    ];

    pub fn is_protected_path<P: AsRef<Path>>(path: P) -> bool {
        let p = path.as_ref();
        let path_str = p.to_string_lossy().to_lowercase();

        for prefix in Self::PROTECTED_SYSTEM_PATHS {
            if path_str.starts_with(&prefix.to_lowercase()) {
                return true;
            }
        }
        false
    }

    pub fn is_directory_traversal<P: AsRef<Path>>(path: P) -> bool {
        let path_str = path.as_ref().to_string_lossy();
        path_str.contains("..")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protected_paths() {
        assert!(SecurityValidator::is_protected_path("C:\\Windows\\System32\\calc.exe"));
        assert!(SecurityValidator::is_protected_path("C:\\Program Files\\app"));
        assert!(!SecurityValidator::is_protected_path("C:\\Users\\Awsaf\\Downloads"));
    }

    #[test]
    fn test_traversal_detection() {
        assert!(SecurityValidator::is_directory_traversal("../secret"));
        assert!(SecurityValidator::is_directory_traversal("C:\\Users\\..\\Windows"));
        assert!(!SecurityValidator::is_directory_traversal("C:\\Users\\Awsaf\\Documents"));
    }
}
