use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CollisionPolicy {
    Skip,
    KeepBoth,
    Overwrite,
}

#[derive(Debug, Clone)]
pub struct OperationResult {
    pub success: BooleanResult,
    pub original_path: PathBuf,
    pub final_path: PathBuf,
    pub content_hash: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BooleanResult {
    Success,
    Skipped,
    Failed,
}

pub struct SafeFileOperations;

impl SafeFileOperations {
    pub fn calculate_hash<P: AsRef<Path>>(path: P) -> Option<String> {
        let bytes = fs::read(path).ok()?;
        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        Some(format!("{:x}", hasher.finalize()))
    }

    pub fn generate_unique_name(dest: &Path) -> PathBuf {
        if !dest.exists() {
            return dest.to_path_buf();
        }

        let parent = dest.parent().unwrap_or_else(|| Path::new(""));
        let stem = dest.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
        let ext = dest.extension().and_then(|s| s.to_str()).unwrap_or("");

        let mut counter = 1;
        loop {
            let filename = if ext.is_empty() {
                format!("{} ({})", stem, counter)
            } else {
                format!("{} ({}).{}", stem, counter, ext)
            };
            let candidate = parent.join(filename);
            if !candidate.exists() {
                return candidate;
            }
            counter += 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unique_name_generator() {
        let path = PathBuf::from("non_existent_file.pdf");
        let unique = SafeFileOperations::generate_unique_name(&path);
        assert_eq!(unique, path);
    }
}
