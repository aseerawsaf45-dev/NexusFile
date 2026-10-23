use std::env;
use std::path::Path;
use nexusfile_core::file_classifier::FileClassifier;
use nexusfile_core::security_validation::SecurityValidator;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("NexusFile Core Engine v0.1.0");
        println!("Usage:");
        println!("  nexusfile-core classify <filepath>");
        println!("  nexusfile-core check-safe <path>");
        return;
    }

    match args[1].as_str() {
        "classify" => {
            if args.len() < 3 {
                println!("Error: file path required");
                return;
            }
            let path = Path::new(&args[2]);
            let cat = FileClassifier::classify_path(path);
            let proj = FileClassifier::extract_project_keyword(path);
            println!("File: {}", path.display());
            println!("Category: {:?}", cat);
            println!("Project: {:?}", proj);
        }
        "check-safe" => {
            if args.len() < 3 {
                println!("Error: path required");
                return;
            }
            let is_protected = SecurityValidator::is_protected_path(&args[2]);
            let is_traversal = SecurityValidator::is_directory_traversal(&args[2]);
            let is_safe = !is_protected && !is_traversal;
            println!("Path: {}", args[2]);
            println!("Protected: {}", is_protected);
            println!("Safe: {}", is_safe);
        }
        cmd => {
            println!("Unknown command: {}", cmd);
        }
    }
}

