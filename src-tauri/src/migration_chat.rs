use crate::game_card_paths::is_safe_id;
use crate::json_store::{read_json, write_json};
use crate::migration_report::MigrationError;
use serde_json::Value;
use std::path::{Path, PathBuf};

fn migration_error(stage: &str, path: &Path, error: impl std::fmt::Display) -> MigrationError {
    MigrationError::new(stage, path, error)
}

fn active_messages(staging: &Path) -> Result<PathBuf, MigrationError> {
    let game_cards = staging.join("game-cards");
    let active_path = game_cards.join("active.json");
    let active = read_json::<Value>(&active_path)
        .map_err(|error| migration_error("read active game card", &active_path, error))?;
    let card_id = active
        .as_ref()
        .and_then(|value| value.get("id"))
        .and_then(Value::as_str)
        .filter(|id| is_safe_id(id));
    let sessions = card_id
        .filter(|id| {
            game_cards
                .join("cards")
                .join(id)
                .join("card.json")
                .is_file()
        })
        .map(|id| game_cards.join("cards").join(id).join("sessions"))
        .unwrap_or_else(|| game_cards.join("no-card/sessions"));
    let active_session = read_json::<Value>(&sessions.join("active.json"))
        .map_err(|error| migration_error("read active session", &sessions, error))?
        .and_then(|value| value.get("id").and_then(Value::as_str).map(str::to_string))
        .filter(|id| is_safe_id(id))
        .unwrap_or_else(|| "default".to_string());
    Ok(sessions.join(active_session).join("messages.json"))
}

pub fn migrate(staging: &Path, fallback: Option<&Path>) -> Result<(), MigrationError> {
    let target = active_messages(staging)?;
    if target.is_file() {
        return Ok(());
    }
    let roots = [Some(staging), fallback];
    let source = roots.into_iter().flatten().find_map(|root| {
        [
            root.join("game-cards/chat/history.json"),
            root.join("chat/history.json"),
            root.join("chat-histories/chat-history.json"),
        ]
        .into_iter()
        .find(|path| path.is_file())
    });
    let Some(source) = source else {
        return Ok(());
    };
    let value = read_json::<Value>(&source)
        .map_err(|error| migration_error("read legacy chat", &source, error))?
        .ok_or_else(|| migration_error("read legacy chat", &source, "file disappeared"))?;
    write_json(&target, &value)
        .map_err(|error| migration_error("write migrated chat", &target, error))
}
