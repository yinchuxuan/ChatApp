use crate::migration_fs::{copy_business_data, has_business_data, install, staging_path};
use crate::migration_layout;
use crate::migration_report::{self, MigrationError, MigrationReport};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Clone, Debug)]
pub struct ElectronRoots {
    pub current: PathBuf,
    pub legacy: PathBuf,
}

pub fn roots_for(os: &str, config_dir: &Path, data_dir: &Path) -> ElectronRoots {
    let base = if os == "linux" { config_dir } else { data_dir };
    ElectronRoots {
        current: base.join("ChatApp"),
        legacy: base.join("harness_lab"),
    }
}

fn migration_error(stage: &str, path: &Path, error: impl std::fmt::Display) -> MigrationError {
    MigrationError::new(stage, path, error)
}

fn source_error(mut error: MigrationError, staging: &Path, source: &Path) -> MigrationError {
    let error_path = Path::new(&error.0.path);
    if let Ok(relative) = error_path.strip_prefix(staging) {
        error.0.path = source.join(relative).display().to_string();
    }
    error
}

fn write_report(root: &Path, report: &MigrationReport) -> Result<(), MigrationError> {
    migration_report::write(root, report)
        .map_err(|error| migration_error("write migration report", root, error))
}

fn select_sources(
    roots: &ElectronRoots,
) -> Result<Option<(PathBuf, Option<PathBuf>)>, MigrationError> {
    let has_current = has_business_data(&roots.current)?;
    let has_legacy = has_business_data(&roots.legacy)?;
    if has_current {
        return Ok(Some((
            roots.current.clone(),
            has_legacy.then(|| roots.legacy.clone()),
        )));
    }
    Ok(has_legacy.then(|| (roots.legacy.clone(), None)))
}

fn migrate(
    target: &Path,
    roots: &ElectronRoots,
    staging: &Path,
) -> Result<MigrationReport, MigrationError> {
    if let Some(report) = migration_report::completed(target)
        .map_err(|error| migration_error("read migration report", target, error))?
    {
        return Ok(report);
    }
    if has_business_data(target)? {
        let report = migration_report::create("skipped-existing-data", None, Vec::new(), None);
        write_report(target, &report)?;
        return Ok(report);
    }
    let Some((source, fallback)) = select_sources(roots)? else {
        let report = migration_report::create("no-source", None, Vec::new(), None);
        write_report(target, &report)?;
        return Ok(report);
    };
    fs::create_dir_all(staging)
        .map_err(|error| migration_error("create staging directory", staging, error))?;
    copy_business_data(&source, staging)?;
    let warnings = migration_layout::upgrade(staging, fallback.as_deref())
        .map_err(|error| source_error(error, staging, &source))?;
    let report = migration_report::create("migrated", Some(&source), warnings, None);
    write_report(staging, &report)?;
    install(staging, target)?;
    Ok(report)
}

pub fn run(target: &Path, roots: &ElectronRoots) -> Result<MigrationReport, MigrationError> {
    let staging = staging_path(target);
    let _ = fs::remove_dir_all(&staging);
    match migrate(target, roots, &staging) {
        Ok(report) => Ok(report),
        Err(error) => {
            let _ = fs::remove_dir_all(&staging);
            let report =
                migration_report::create("failed", None, Vec::new(), Some(error.0.clone()));
            if let Err(report_error) = migration_report::write(target, &report) {
                eprintln!("Failed to record Electron migration error: {report_error}");
            }
            Err(error)
        }
    }
}
