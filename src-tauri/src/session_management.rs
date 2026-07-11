use crate::json_store::{exists, write_json, AppResult};
use crate::sessions::{self, SessionMeta, DEFAULT_SESSION_ID};
use chrono::Utc;
use serde_json::json;
use std::fs;
use std::path::Path;

pub fn create(root: &Path, title: &str) -> AppResult<String> {
    let base = format!("session-{}", Utc::now().timestamp_millis());
    let mut id = base.clone();
    let mut sequence = 1;
    while exists(&root.join(&id))? {
        id = format!("{base}-{sequence}");
        sequence += 1;
    }
    let title = if title.is_empty() { "新会话" } else { title };
    sessions::ensure(root, &id, &title.chars().take(60).collect::<String>())?;
    Ok(id)
}

pub fn set_active(root: &Path, id: &str) -> AppResult<()> {
    if !sessions::is_safe_id(id)
        || !sessions::read_index(root)?
            .sessions
            .iter()
            .any(|item| item.id == id)
    {
        return Err("Chat session not found".to_string());
    }
    write_json(&root.join("active.json"), &json!({ "id": id }))
}

pub fn rename(root: &Path, id: &str, title: &str) -> AppResult<SessionMeta> {
    let mut index = sessions::read_index(root)?;
    let session = index
        .sessions
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or_else(|| "Chat session not found".to_string())?;
    let next_title = title.trim().chars().take(60).collect::<String>();
    if !next_title.is_empty() {
        session.title = next_title;
    }
    let result = session.clone();
    sessions::write_index(root, &mut index)?;
    Ok(result)
}

pub fn delete(root: &Path, id: &str) -> AppResult<String> {
    if !sessions::is_safe_id(id) {
        return Err("Invalid chat session id".to_string());
    }
    let mut index = sessions::read_index(root)?;
    index.sessions.retain(|item| item.id != id);
    fs::remove_dir_all(root.join(id))
        .or_else(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                Ok(())
            } else {
                Err(error)
            }
        })
        .map_err(|error| error.to_string())?;
    if index.sessions.is_empty() {
        return Ok(sessions::ensure(root, DEFAULT_SESSION_ID, "默认会话")?.id);
    }
    sessions::write_index(root, &mut index)?;
    let current = sessions::active_id(root)?;
    if current == id {
        let fallback = sessions::read_index(root)?.sessions[0].id.clone();
        set_active(root, &fallback)?;
        return Ok(fallback);
    }
    Ok(current)
}
