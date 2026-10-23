use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SafetyLevel {
    LevelA, // Generally safe (old stale temp, regenerable thumbnail caches)
    LevelB, // Review recommended (crash dumps, browser cache)
    LevelC, // Protected (Windows system files, personal documents)
}

pub struct SystemCleanerCore;

impl SystemCleanerCore {
    /// Classify path safety level
    pub fn classify_safety(path_str: &str, is_in_temp: bool, age_days: u32, min_age_days: u32) -> SafetyLevel {
        let lower = path_str.to_lowercase();

        // Level C: Protected system or user personal areas
        if lower.starts_with("c:\\windows")
            || lower.starts_with("c:\\program files")
            || lower.contains("desktop")
            || lower.contains("documents")
            || lower.contains("cookies")
            || lower.contains("login data")
        {
            return SafetyLevel::LevelC;
        }

        // Level B: Review recommended
        if lower.contains("crashdumps") || lower.contains("cache_data") {
            return SafetyLevel::LevelB;
        }

        // Level A: Stale temp files meeting age policy
        if is_in_temp && age_days >= min_age_days {
            return SafetyLevel::LevelA;
        }

        // If in temp but recent, requires review
        if is_in_temp {
            return SafetyLevel::LevelB;
        }

        SafetyLevel::LevelB
    }

    /// Check if item is eligible for automatic removal
    pub fn is_eligible_for_cleanup(safety: SafetyLevel, is_locked: bool) -> bool {
        if is_locked {
            return false;
        }
        matches!(safety, SafetyLevel::LevelA | SafetyLevel::LevelB)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_protection_level_c() {
        let level = SystemCleanerCore::classify_safety("C:\\Windows\\System32\\driver.sys", false, 100, 7);
        assert_eq!(level, SafetyLevel::LevelC);
        assert!(!SystemCleanerCore::is_eligible_for_cleanup(level, false));
    }

    #[test]
    fn test_user_temp_level_a_and_b() {
        // Old temp file >= 7 days -> Level A
        let level_old = SystemCleanerCore::classify_safety("C:\\Users\\User\\AppData\\Local\\Temp\\old.tmp", true, 12, 7);
        assert_eq!(level_old, SafetyLevel::LevelA);
        assert!(SystemCleanerCore::is_eligible_for_cleanup(level_old, false));

        // Recent temp file < 7 days -> Level B
        let level_recent = SystemCleanerCore::classify_safety("C:\\Users\\User\\AppData\\Local\\Temp\\new.tmp", true, 2, 7);
        assert_eq!(level_recent, SafetyLevel::LevelB);

        // Locked file is never eligible
        assert!(!SystemCleanerCore::is_eligible_for_cleanup(level_old, true));
    }
}
