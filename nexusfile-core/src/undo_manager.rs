use std::path::Path;

#[derive(Debug, PartialEq, Eq)]
pub enum UndoVerification {
    Valid,
    TargetNotFound,
    ContentModified,
    OriginalLocationOccupied,
}

pub struct UndoManager;

impl UndoManager {
    pub fn verify_undo<P: AsRef<Path>>(
        current_path: P,
        original_target: P,
        expected_hash: Option<&str>,
    ) -> UndoVerification {
        let cur = current_path.as_ref();
        let orig = original_target.as_ref();

        if !cur.exists() {
            return UndoVerification::TargetNotFound;
        }

        if orig.exists() {
            return UndoVerification::OriginalLocationOccupied;
        }

        if let Some(expected) = expected_hash {
            if let Some(actual) = crate::safe_file_operations::SafeFileOperations::calculate_hash(cur) {
                if actual != expected {
                    return UndoVerification::ContentModified;
                }
            }
        }

        UndoVerification::Valid
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_undo_verification_target_missing() {
        let res = UndoManager::verify_undo("non_existent_target.txt", "orig.txt", None);
        assert_eq!(res, UndoVerification::TargetNotFound);
    }
}
