use std::path::{Path, PathBuf};

#[derive(Debug, PartialEq, Eq)]
pub enum ConflictResolution {
    Skip,
    RenameTo(PathBuf),
    SendToQueue(String),
}

pub struct ConflictResolver;

impl ConflictResolver {
    pub fn resolve<P: AsRef<Path>>(
        _source: P,
        destination: P,
        collision_policy: &str,
    ) -> ConflictResolution {
        let dest = destination.as_ref();

        if !dest.exists() {
            return ConflictResolution::RenameTo(dest.to_path_buf());
        }

        match collision_policy {
            "skip" => ConflictResolution::Skip,
            "keep_both" => {
                let unique = crate::safe_file_operations::SafeFileOperations::generate_unique_name(dest);
                ConflictResolution::RenameTo(unique)
            }
            "overwrite_with_confirmation" => {
                ConflictResolution::SendToQueue("File already exists. User approval required before overwriting.".to_string())
            }
            _ => ConflictResolution::Skip,
        }
    }
}
