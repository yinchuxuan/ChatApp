use crate::app_storage::AppStorage;
use crate::game_card_copy;
use crate::game_card_error::{CardResult, GameCardError};
use crate::game_card_imports::read_card;
use crate::game_card_paths::{card_dir, existing_file, is_safe_id, require_safe_id};
use crate::game_card_schema::validate_card;
use crate::json_store::{exists, read_json, write_json};
use serde_json::{json, Value};
use std::fs;
use std::path::Path;

fn cards_dir(storage: &AppStorage) -> std::path::PathBuf {
    storage.game_cards_dir().join("cards")
}

pub async fn get(storage: &AppStorage, id: &str) -> CardResult<Option<Value>> {
    let root = card_dir(&cards_dir(storage), id)?;
    if !exists(&root.join("card.json")).map_err(GameCardError::from)? {
        return Ok(None);
    }
    let _guard = storage.lock(&root).await;
    read_card(&root).map(Some)
}

pub async fn list(storage: &AppStorage) -> CardResult<Vec<Value>> {
    let root = cards_dir(storage);
    if !exists(&root).map_err(GameCardError::from)? {
        return Ok(Vec::new());
    }
    let mut ids: Vec<_> = fs::read_dir(&root)?
        .filter_map(Result::ok)
        .filter_map(|entry| entry.file_name().into_string().ok())
        .filter(|id| is_safe_id(id) && root.join(id).join("card.json").is_file())
        .collect();
    ids.sort();
    let mut cards = Vec::new();
    for id in ids {
        if let Some(card) = get(storage, &id).await? {
            cards.push(card);
        }
    }
    Ok(cards)
}

pub async fn save(storage: &AppStorage, card: Value) -> CardResult<()> {
    let id = card
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| GameCardError::new("Game card must have a safe id"))?;
    require_safe_id(id)?;
    let root = card_dir(&cards_dir(storage), id)?;
    let _guard = storage.lock(&root).await;
    write_json(&root.join("card.json"), &card).map_err(GameCardError::from)
}

pub async fn set_active(storage: &AppStorage, id: Option<&str>) -> CardResult<()> {
    let active_path = storage.game_cards_dir().join("active.json");
    let _guard = storage.lock(&active_path).await;
    if let Some(id) = id.filter(|value| !value.is_empty()) {
        require_safe_id(id)?;
        if !cards_dir(storage).join(id).join("card.json").is_file() {
            return Err(GameCardError::new("Game card not found"));
        }
        write_json(&active_path, &json!({ "id": id })).map_err(GameCardError::from)
    } else {
        write_json(&active_path, &json!({ "id": null })).map_err(GameCardError::from)
    }
}

pub async fn active(storage: &AppStorage) -> CardResult<Option<Value>> {
    let path = storage.game_cards_dir().join("active.json");
    let active = read_json::<Value>(&path).map_err(GameCardError::from)?;
    let Some(id) = active
        .as_ref()
        .and_then(|value| value.get("id"))
        .and_then(Value::as_str)
    else {
        return Ok(None);
    };
    if !is_safe_id(id) {
        return Ok(None);
    }
    get(storage, id).await
}

pub async fn read_text(storage: &AppStorage, id: &str, relative: &str) -> CardResult<String> {
    let root = card_dir(&cards_dir(storage), id)?;
    let _guard = storage.lock(&root).await;
    let path = existing_file(&root, relative)?;
    fs::read_to_string(path).map_err(GameCardError::from)
}

pub async fn import(storage: &AppStorage, source: &Path) -> CardResult<Value> {
    let source = source
        .canonicalize()
        .map_err(|_| GameCardError::new("Selected folder must contain card.json"))?;
    let card = read_card(&source)?;
    let id = card
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| GameCardError::new("Game card must have a safe id"))?;
    require_safe_id(id)?;
    validate_card(&card, &source)?;
    let target = card_dir(&cards_dir(storage), id)?;
    let _guard = storage.lock(&target).await;
    if target.canonicalize().ok().as_ref() != Some(&source) {
        let temp = game_card_copy::prepare(&source, &target)?;
        let result = read_card(&temp).and_then(|installed| validate_card(&installed, &temp));
        if let Err(error) = result {
            let _ = fs::remove_dir_all(temp);
            return Err(error);
        }
        game_card_copy::replace(&temp, &target)?;
    }
    drop(_guard);
    set_active(storage, Some(id)).await?;
    Ok(card)
}
