use crate::config_commands::{validate_background_path, USER_BACKGROUND_URL};
use crate::game_card_paths::is_safe_id;
use crate::json_store::{read_json, write_json};
use crate::migration_chat;
use crate::migration_fs::copy_path;
use crate::migration_report::{MigrationError, MigrationNotice};
use percent_encoding::percent_decode_str;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

fn migration_error(stage: &str, path: &Path, error: impl std::fmt::Display) -> MigrationError {
    MigrationError::new(stage, path, error)
}

fn first_file(paths: impl IntoIterator<Item = PathBuf>) -> Option<PathBuf> {
    paths.into_iter().find(|path| path.is_file())
}

fn migrate_json(
    target: &Path,
    sources: impl IntoIterator<Item = PathBuf>,
) -> Result<(), MigrationError> {
    if target.is_file() {
        return Ok(());
    }
    let Some(source) = first_file(sources) else {
        return Ok(());
    };
    let value = read_json::<Value>(&source)
        .map_err(|error| migration_error("read legacy JSON", &source, error))?
        .ok_or_else(|| migration_error("read legacy JSON", &source, "file disappeared"))?;
    write_json(target, &value)
        .map_err(|error| migration_error("write migrated JSON", target, error))
}

fn clear_background(config: &mut Value) {
    if let Some(object) = config.as_object_mut() {
        object.insert(
            "backgroundImageUrl".to_string(),
            Value::String(String::new()),
        );
        object.remove("backgroundImagePath");
    }
}

fn background_path(config: &Value) -> Option<PathBuf> {
    let url = config.get("backgroundImageUrl")?.as_str()?;
    if url == USER_BACKGROUND_URL {
        return config
            .get("backgroundImagePath")
            .and_then(Value::as_str)
            .map(PathBuf::from);
    }
    let encoded = url.strip_prefix("local://")?;
    percent_decode_str(encoded)
        .decode_utf8()
        .ok()
        .map(|value| PathBuf::from(value.as_ref()))
}

fn migrate_background(
    staging: &Path,
    fallback: Option<&Path>,
    warnings: &mut Vec<MigrationNotice>,
) -> Result<(), MigrationError> {
    let target = staging.join("config/background.json");
    let source = if target.is_file() {
        target.clone()
    } else {
        let mut candidates = vec![staging.join("background-config.json")];
        if let Some(root) = fallback {
            candidates.push(root.join("background-config.json"));
        }
        let Some(source) = first_file(candidates) else {
            return Ok(());
        };
        source
    };
    let mut config = read_json::<Value>(&source)
        .map_err(|error| migration_error("read background config", &source, error))?
        .ok_or_else(|| migration_error("read background config", &source, "file disappeared"))?;
    if let Some(path) = background_path(&config) {
        let validated = if path.is_absolute() {
            validate_background_path(&path)
        } else {
            Err("Background image path must be absolute".to_string())
        };
        match validated {
            Ok(real_path) => {
                config["backgroundImageUrl"] = Value::String(USER_BACKGROUND_URL.to_string());
                config["backgroundImagePath"] =
                    Value::String(real_path.to_string_lossy().into_owned());
            }
            Err(error) => {
                clear_background(&mut config);
                warnings.push(MigrationNotice {
                    stage: "background config".to_string(),
                    path: path.display().to_string(),
                    message: error,
                });
            }
        }
    }
    write_json(&target, &config)
        .map_err(|error| migration_error("write background config", &target, error))
}

fn migrate_legacy_cards(staging: &Path, fallback: Option<&Path>) -> Result<(), MigrationError> {
    let Some(legacy) = fallback.map(|root| root.join("game-cards")) else {
        return Ok(());
    };
    for relative in ["active.json", "cards"] {
        let source = legacy.join(relative);
        let target = staging.join("game-cards").join(relative);
        if source.exists() && !target.exists() {
            copy_path(&source, &target)?;
        }
    }
    Ok(())
}

fn migrate_flat_cards(staging: &Path) -> Result<(), MigrationError> {
    let cards = staging.join("game-cards/cards");
    if !cards.is_dir() {
        return Ok(());
    }
    let entries = fs::read_dir(&cards)
        .map_err(|error| migration_error("read flat game cards", &cards, error))?;
    for entry in entries {
        let entry =
            entry.map_err(|error| migration_error("read flat game cards", &cards, error))?;
        let path = entry.path();
        let Some(id) = path
            .file_name()
            .and_then(|name| name.to_str())
            .and_then(|name| name.strip_suffix(".json"))
            .filter(|id| is_safe_id(id))
        else {
            continue;
        };
        let target = cards.join(id).join("card.json");
        migrate_json(&target, [path])?;
    }
    Ok(())
}

pub fn upgrade(
    staging: &Path,
    fallback: Option<&Path>,
) -> Result<Vec<MigrationNotice>, MigrationError> {
    let mut warnings = Vec::new();
    let model_sources = [Some(staging), fallback]
        .into_iter()
        .flatten()
        .map(|root| root.join("model-config.json"));
    migrate_json(&staging.join("config/model.json"), model_sources)?;
    migrate_background(staging, fallback, &mut warnings)?;
    migrate_legacy_cards(staging, fallback)?;
    migrate_flat_cards(staging)?;
    migration_chat::migrate(staging, fallback)?;
    Ok(warnings)
}
