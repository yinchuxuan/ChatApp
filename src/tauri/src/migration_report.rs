use crate::json_store::{read_json, write_json, AppResult};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::path::{Path, PathBuf};

pub const MIGRATION_VERSION: u32 = 1;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationNotice {
    pub stage: String,
    pub path: String,
    pub message: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationReport {
    pub version: u32,
    pub status: String,
    pub source: Option<String>,
    pub completed_at: String,
    pub warnings: Vec<MigrationNotice>,
    pub error: Option<MigrationNotice>,
}

#[derive(Debug)]
pub struct MigrationError(pub MigrationNotice);

impl MigrationError {
    pub fn new(stage: &str, path: &Path, error: impl fmt::Display) -> Self {
        Self(MigrationNotice {
            stage: stage.to_string(),
            path: path.display().to_string(),
            message: error.to_string(),
        })
    }
}

impl fmt::Display for MigrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "Electron data migration failed at {} ({}): {}",
            self.0.stage, self.0.path, self.0.message
        )
    }
}

impl std::error::Error for MigrationError {}

pub fn report_path(root: &Path) -> PathBuf {
    root.join("migration/electron-user-data-v1.json")
}

pub fn completed(root: &Path) -> AppResult<Option<MigrationReport>> {
    Ok(read_json::<MigrationReport>(&report_path(root))?
        .filter(|report| report.version >= MIGRATION_VERSION && report.status != "failed"))
}

pub fn create(
    status: &str,
    source: Option<&Path>,
    warnings: Vec<MigrationNotice>,
    error: Option<MigrationNotice>,
) -> MigrationReport {
    MigrationReport {
        version: MIGRATION_VERSION,
        status: status.to_string(),
        source: source.map(|path| path.display().to_string()),
        completed_at: Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        warnings,
        error,
    }
}

pub fn write(root: &Path, report: &MigrationReport) -> AppResult<()> {
    write_json(&report_path(root), report)
}
