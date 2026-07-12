use crate::app_storage::AppStorage;
use crate::config_commands::USER_BACKGROUND_URL;
use crate::game_card_paths::{card_dir, existing_file};
use crate::json_store::read_json;
use serde_json::Value;
use std::path::{Path, PathBuf};

const IMAGE_TYPES: &[(&str, &str)] = &[
    ("png", "image/png"),
    ("jpg", "image/jpeg"),
    ("jpeg", "image/jpeg"),
    ("webp", "image/webp"),
    ("gif", "image/gif"),
    ("bmp", "image/bmp"),
];
const AUDIO_TYPES: &[(&str, &str)] = &[
    ("mp3", "audio/mpeg"),
    ("ogg", "audio/ogg"),
    ("wav", "audio/wav"),
    ("m4a", "audio/mp4"),
];

pub struct ResourceAsset {
    pub path: PathBuf,
    pub mime: &'static str,
    pub audio: bool,
}

fn mime_for(path: &Path, types: &[(&str, &'static str)]) -> Option<&'static str> {
    let extension = path.extension()?.to_str()?.to_ascii_lowercase();
    types
        .iter()
        .find_map(|(value, mime)| (*value == extension).then_some(*mime))
}

fn active_card_id(storage: &AppStorage) -> Result<String, String> {
    let active = read_json::<Value>(&storage.game_cards_dir().join("active.json"))?
        .ok_or_else(|| "Game card resource is not authorized".to_string())?;
    active
        .get("id")
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| "Game card resource is not authorized".to_string())
}

fn resolve_card_asset(storage: &AppStorage, parts: &[&str]) -> Result<ResourceAsset, String> {
    if parts.len() < 4 || active_card_id(storage)? != parts[1] {
        return Err("Game card resource is not authorized".to_string());
    }
    let cards_root = storage.game_cards_dir().join("cards");
    let real_cards_root = cards_root
        .canonicalize()
        .map_err(|_| "Game card directory not found".to_string())?;
    let root = card_dir(&cards_root, parts[1]).map_err(|error| error.error)?;
    let real_root = root
        .canonicalize()
        .map_err(|_| "Game card directory not found".to_string())?;
    if !real_root.starts_with(&real_cards_root) {
        return Err("Game card resource path must stay inside cards directory".to_string());
    }
    let path = existing_file(&root, &parts[3..].join("/")).map_err(|error| error.error)?;
    let (mime, audio) = match parts[2] {
        "image" => (mime_for(&path, IMAGE_TYPES), false),
        "audio" => (mime_for(&path, AUDIO_TYPES), true),
        _ => return Err("Unsupported game card resource type".to_string()),
    };
    Ok(ResourceAsset {
        path,
        mime: mime.ok_or_else(|| "Unsupported game card resource extension".to_string())?,
        audio,
    })
}

fn resolve_user_background(storage: &AppStorage) -> Result<ResourceAsset, String> {
    let config = read_json::<Value>(&storage.background_config_path())?
        .ok_or_else(|| "User background is not authorized".to_string())?;
    if config.get("backgroundImageUrl").and_then(Value::as_str) != Some(USER_BACKGROUND_URL) {
        return Err("User background is not authorized".to_string());
    }
    let path = config
        .get("backgroundImagePath")
        .and_then(Value::as_str)
        .map(PathBuf::from)
        .ok_or_else(|| "User background is not authorized".to_string())?
        .canonicalize()
        .map_err(|_| "User background file not found".to_string())?;
    if !path.is_file() {
        return Err("User background must be a file".to_string());
    }
    let mime = mime_for(&path, IMAGE_TYPES)
        .ok_or_else(|| "Invalid user background extension".to_string())?;
    Ok(ResourceAsset {
        path,
        mime,
        audio: false,
    })
}

pub fn resolve_resource(storage: &AppStorage, virtual_path: &str) -> Result<ResourceAsset, String> {
    let parts: Vec<_> = virtual_path.split('/').collect();
    match parts.as_slice() {
        ["user-background", "current"] => resolve_user_background(storage),
        ["game-card", ..] => resolve_card_asset(storage, &parts),
        _ => Err("Local resource is not authorized".to_string()),
    }
}
