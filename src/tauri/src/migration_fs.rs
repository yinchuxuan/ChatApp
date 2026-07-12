use crate::migration_report::MigrationError;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

const BUSINESS_ENTRIES: &[&str] = &[
    "config",
    "game-cards",
    "model-config.json",
    "background-config.json",
    "chat",
    "chat-histories",
];

fn io_error(stage: &str, path: &Path, error: impl std::fmt::Display) -> MigrationError {
    MigrationError::new(stage, path, error)
}

pub fn has_business_data(root: &Path) -> Result<bool, MigrationError> {
    let files = [
        "config/model.json",
        "config/background.json",
        "game-cards/active.json",
        "model-config.json",
        "background-config.json",
        "chat/history.json",
        "chat-histories/chat-history.json",
        "game-cards/chat/history.json",
    ];
    if files.iter().any(|relative| root.join(relative).is_file()) {
        return Ok(true);
    }
    for relative in ["game-cards/cards", "game-cards/no-card"] {
        let path = root.join(relative);
        if path.is_dir()
            && fs::read_dir(&path)
                .map_err(|error| io_error("discover source", &path, error))?
                .next()
                .is_some()
        {
            return Ok(true);
        }
    }
    Ok(false)
}

pub fn copy_path(source: &Path, target: &Path) -> Result<(), MigrationError> {
    let metadata =
        fs::symlink_metadata(source).map_err(|error| io_error("copy data", source, error))?;
    if metadata.file_type().is_symlink() {
        return Err(io_error(
            "copy data",
            source,
            "symbolic links are not supported",
        ));
    }
    if metadata.is_file() {
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| io_error("create staging directory", parent, error))?;
        }
        fs::copy(source, target).map_err(|error| io_error("copy data", source, error))?;
        return Ok(());
    }
    if !metadata.is_dir() {
        return Err(io_error("copy data", source, "unsupported file type"));
    }
    fs::create_dir_all(target)
        .map_err(|error| io_error("create staging directory", target, error))?;
    for entry in fs::read_dir(source).map_err(|error| io_error("read data", source, error))? {
        let entry = entry.map_err(|error| io_error("read data", source, error))?;
        copy_path(&entry.path(), &target.join(entry.file_name()))?;
    }
    Ok(())
}

pub fn copy_business_data(source: &Path, target: &Path) -> Result<(), MigrationError> {
    for relative in BUSINESS_ENTRIES {
        let source_path = source.join(relative);
        if source_path.exists() {
            copy_path(&source_path, &target.join(relative))?;
        }
    }
    Ok(())
}

pub fn staging_path(target: &Path) -> PathBuf {
    let parent = target.parent().unwrap_or_else(|| Path::new("."));
    let name = target
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("data");
    parent.join(format!(".{name}-electron-migration-{}", Uuid::new_v4()))
}

pub fn install(staging: &Path, target: &Path) -> Result<(), MigrationError> {
    let parent = target.parent().unwrap_or_else(|| Path::new("."));
    fs::create_dir_all(parent).map_err(|error| io_error("prepare install", parent, error))?;
    if !target.exists() {
        return fs::rename(staging, target)
            .map_err(|error| io_error("install migrated data", target, error));
    }
    let backup = parent.join(format!(".electron-data-backup-{}", Uuid::new_v4()));
    fs::rename(target, &backup).map_err(|error| io_error("backup Tauri data", target, error))?;
    if let Err(error) = fs::rename(staging, target) {
        let rollback = fs::rename(&backup, target);
        let detail = rollback.map_or_else(
            |rollback| format!("{error}; rollback failed: {rollback}"),
            |_| error.to_string(),
        );
        return Err(io_error("install migrated data", target, detail));
    }
    let _ = fs::remove_dir_all(backup);
    Ok(())
}
