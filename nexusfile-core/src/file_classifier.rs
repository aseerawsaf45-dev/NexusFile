use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FileCategory {
    Documents,
    Spreadsheets,
    Presentations,
    Images,
    Videos,
    Audio,
    Archives,
    Installers,
    Development,
    Design,
    Fonts,
    Data,
    Ebooks,
    Shortcuts,
    Torrents,
    Unknown,
}

impl FileCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            FileCategory::Documents => "Documents",
            FileCategory::Spreadsheets => "Spreadsheets",
            FileCategory::Presentations => "Presentations",
            FileCategory::Images => "Images",
            FileCategory::Videos => "Videos",
            FileCategory::Audio => "Audio",
            FileCategory::Archives => "Archives",
            FileCategory::Installers => "Installers",
            FileCategory::Development => "Development",
            FileCategory::Design => "Design",
            FileCategory::Fonts => "Fonts",
            FileCategory::Data => "Data",
            FileCategory::Ebooks => "Ebooks",
            FileCategory::Shortcuts => "Shortcuts",
            FileCategory::Torrents => "Torrents",
            FileCategory::Unknown => "Unknown",
        }
    }
}

pub struct FileClassifier;

impl FileClassifier {
    pub fn classify_by_extension(ext: &str) -> FileCategory {
        let ext_lower = ext.to_lowercase();
        match ext_lower.as_str() {
            // Documents
            "pdf" | "doc" | "docx" | "txt" | "rtf" | "odt" | "tex" | "wps" => FileCategory::Documents,
            // Spreadsheets
            "xls" | "xlsx" | "csv" | "ods" | "tsv" | "xlsm" => FileCategory::Spreadsheets,
            // Presentations
            "ppt" | "pptx" | "odp" | "key" => FileCategory::Presentations,
            // Images
            "jpg" | "jpeg" | "png" | "webp" | "gif" | "svg" | "tiff" | "bmp" | "heic" | "ico" => {
                FileCategory::Images
            }
            // Videos
            "mp4" | "mkv" | "mov" | "avi" | "webm" | "wmv" | "flv" | "m4v" => FileCategory::Videos,
            // Audio
            "mp3" | "wav" | "flac" | "aac" | "m4a" | "ogg" | "wma" => FileCategory::Audio,
            // Archives
            "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" | "iso" | "tgz" => FileCategory::Archives,
            // Installers
            "exe" | "msi" | "msix" | "appx" => FileCategory::Installers,
            // Development
            "py" | "js" | "ts" | "jsx" | "tsx" | "html" | "css" | "rs" | "java" | "c" | "cpp" | "h"
            | "json" | "yaml" | "yml" | "toml" | "sh" | "bat" | "ps1" | "sql" => {
                FileCategory::Development
            }
            // Design
            "psd" | "ai" | "eps" | "indd" | "fig" | "blend" | "sketch" | "dwg" => FileCategory::Design,
            // Fonts
            "ttf" | "otf" | "woff" | "woff2" => FileCategory::Fonts,
            // Data
            "db" | "sqlite" | "sqlite3" | "parquet" | "xml" | "mdb" => FileCategory::Data,
            // Ebooks
            "epub" | "mobi" | "azw" | "azw3" => FileCategory::Ebooks,
            // Shortcuts
            "lnk" | "url" => FileCategory::Shortcuts,
            // Torrents
            "torrent" => FileCategory::Torrents,
            // Unknown
            _ => FileCategory::Unknown,
        }
    }

    pub fn classify_path<P: AsRef<Path>>(path: P) -> FileCategory {
        let p = path.as_ref();
        if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
            let cat = Self::classify_by_extension(ext);
            if cat != FileCategory::Unknown {
                return cat;
            }
        }

        // Heuristics based on filename
        if let Some(name) = p.file_name().and_then(|s| s.to_str()) {
            let lower = name.to_lowercase();
            if lower.contains("invoice") || lower.contains("receipt") || lower.contains("statement") {
                return FileCategory::Documents;
            }
            if lower.contains("screenshot") || lower.contains("photo") {
                return FileCategory::Images;
            }
        }

        FileCategory::Unknown
    }

    pub fn extract_project_keyword<P: AsRef<Path>>(path: P) -> Option<String> {
        let p = path.as_ref();
        let name = p.file_name()?.to_str()?;
        let parts: Vec<&str> = name.split(&['_', '-', ' '][..]).collect();
        if let Some(first) = parts.first() {
            if first.len() >= 3 {
                let lower = first.to_lowercase();
                if !["the", "new", "copy", "final", "draft", "screenshot"].contains(&lower.as_str()) {
                    return Some(first.to_string());
                }
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classification_extensions() {
        assert_eq!(FileClassifier::classify_by_extension("pdf"), FileCategory::Documents);
        assert_eq!(FileClassifier::classify_by_extension("xlsx"), FileCategory::Spreadsheets);
        assert_eq!(FileClassifier::classify_by_extension("PNG"), FileCategory::Images);
        assert_eq!(FileClassifier::classify_by_extension("zip"), FileCategory::Archives);
        assert_eq!(FileClassifier::classify_by_extension("rs"), FileCategory::Development);
        assert_eq!(FileClassifier::classify_by_extension("torrent"), FileCategory::Torrents);
        assert_eq!(FileClassifier::classify_by_extension("xyz123"), FileCategory::Unknown);
    }

    #[test]
    fn test_project_keyword_extraction() {
        assert_eq!(
            FileClassifier::extract_project_keyword("FabricX_report_2026.pdf"),
            Some("FabricX".to_string())
        );
        assert_eq!(
            FileClassifier::extract_project_keyword("CaseSpecs-design.psd"),
            Some("CaseSpecs".to_string())
        );
    }
}
