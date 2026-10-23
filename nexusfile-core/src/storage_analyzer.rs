use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub logical_size: u64,
    pub file_count: usize,
    pub dir_count: usize,
    pub percent_of_total: f32,
}

pub struct StorageAnalyzerCore;

impl StorageAnalyzerCore {
    /// Calculate percentage of total size safely avoiding division by zero
    pub fn calculate_percentage(part_size: u64, total_size: u64) -> f32 {
        if total_size == 0 {
            return 0.0;
        }
        ((part_size as f64 / total_size as f64) * 100.0) as f32
    }

    /// Sort descendant files descending by size
    pub fn rank_largest_files<T: Clone>(mut files: Vec<(T, u64)>) -> Vec<(T, u64)> {
        files.sort_by(|a, b| b.1.cmp(&a.1));
        files
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_percentage_calculation() {
        assert_eq!(StorageAnalyzerCore::calculate_percentage(50, 100), 50.0);
        assert_eq!(StorageAnalyzerCore::calculate_percentage(0, 100), 0.0);
        assert_eq!(StorageAnalyzerCore::calculate_percentage(100, 0), 0.0);
    }

    #[test]
    fn test_ranking_largest_files() {
        let files = vec![
            ("small.txt", 1024),
            ("giant.iso", 10485760),
            ("medium.pdf", 204800),
        ];
        let ranked = StorageAnalyzerCore::rank_largest_files(files);
        assert_eq!(ranked[0].0, "giant.iso");
        assert_eq!(ranked[1].0, "medium.pdf");
        assert_eq!(ranked[2].0, "small.txt");
    }
}
