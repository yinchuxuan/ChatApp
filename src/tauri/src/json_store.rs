use atomic_write_file::AtomicWriteFile;
use serde::de::DeserializeOwned;
use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::Path;

pub type AppResult<T> = Result<T, String>;

fn storage_error(action: &str, path: &Path, error: impl std::fmt::Display) -> String {
    format!("Failed to {action} {}: {error}", path.display())
}

pub fn exists(path: &Path) -> AppResult<bool> {
    match path.try_exists() {
        Ok(value) => Ok(value),
        Err(error) => Err(storage_error("access", path, error)),
    }
}

pub fn read_json<T: DeserializeOwned>(path: &Path) -> AppResult<Option<T>> {
    if !exists(path)? {
        return Ok(None);
    }
    let content = fs::read_to_string(path).map_err(|error| storage_error("read", path, error))?;
    serde_json::from_str(&content)
        .map(Some)
        .map_err(|error| storage_error("parse JSON from", path, error))
}

pub fn write_json<T: Serialize>(path: &Path, value: &T) -> AppResult<()> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("Invalid storage path: {}", path.display()))?;
    fs::create_dir_all(parent).map_err(|error| storage_error("create directory", parent, error))?;
    let content = serde_json::to_vec_pretty(value)
        .map_err(|error| storage_error("serialize JSON for", path, error))?;
    let mut file = AtomicWriteFile::open(path)
        .map_err(|error| storage_error("open temporary file for", path, error))?;
    file.write_all(&content)
        .map_err(|error| storage_error("write temporary file for", path, error))?;
    file.commit()
        .map_err(|error| storage_error("replace", path, error))
}
