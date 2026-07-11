use crate::json_store::{exists, read_json, write_json, AppResult};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};

pub const DEFAULT_SESSION_ID: &str = "default";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionMeta {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub message_count: usize,
    pub preview: String,
}

#[derive(Default, Serialize, Deserialize)]
pub struct SessionIndex {
    pub sessions: Vec<SessionMeta>,
}

#[derive(Serialize, Deserialize)]
struct ActiveId {
    id: String,
}

pub struct SessionContext {
    pub id: String,
    pub root: PathBuf,
    pub dir: PathBuf,
    pub messages: PathBuf,
    pub retry_base: PathBuf,
}

pub fn is_safe_id(id: &str) -> bool {
    !id.is_empty()
        && id
            .chars()
            .all(|value| value.is_ascii_alphanumeric() || matches!(value, '_' | '-'))
}

pub fn session_root(game_cards_dir: &Path) -> AppResult<PathBuf> {
    let active_path = game_cards_dir.join("active.json");
    let active = read_json::<ActiveId>(&active_path)?;
    if let Some(active) = active.filter(|item| is_safe_id(&item.id)) {
        let card_dir = game_cards_dir.join("cards").join(active.id);
        if exists(&card_dir.join("card.json"))? {
            return Ok(card_dir.join("sessions"));
        }
    }
    Ok(game_cards_dir.join("no-card/sessions"))
}

pub(crate) fn active_id(root: &Path) -> AppResult<String> {
    let active = read_json::<ActiveId>(&root.join("active.json"))?;
    Ok(active
        .filter(|item| is_safe_id(&item.id))
        .map(|item| item.id)
        .unwrap_or_else(|| DEFAULT_SESSION_ID.to_string()))
}

pub fn active_context(root: &Path) -> AppResult<SessionContext> {
    context(root, &active_id(root)?)
}

fn context(root: &Path, id: &str) -> AppResult<SessionContext> {
    if !is_safe_id(id) {
        return Err("Invalid chat session id".to_string());
    }
    let dir = root.join(id);
    Ok(SessionContext {
        id: id.to_string(),
        root: root.to_path_buf(),
        messages: dir.join("messages.json"),
        retry_base: dir.join("retry-base.json"),
        dir,
    })
}

pub(crate) fn read_index(root: &Path) -> AppResult<SessionIndex> {
    Ok(read_json(&root.join("index.json"))?.unwrap_or_default())
}

pub(crate) fn write_index(root: &Path, index: &mut SessionIndex) -> AppResult<()> {
    index
        .sessions
        .sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    write_json(&root.join("index.json"), index)
}

pub fn ensure_files(context: &SessionContext) -> AppResult<()> {
    if !exists(&context.messages)? {
        write_json(
            &context.messages,
            &json!({ "messages": [], "gameState": {} }),
        )?;
    }
    if !exists(&context.retry_base)? {
        write_json(
            &context.retry_base,
            &json!({ "messages": [], "gameState": {} }),
        )?;
    }
    let active_path = context.root.join("active.json");
    if !exists(&active_path)? {
        write_json(
            &active_path,
            &ActiveId {
                id: context.id.clone(),
            },
        )?;
    }
    Ok(())
}

pub fn ensure(root: &Path, id: &str, title: &str) -> AppResult<SessionMeta> {
    let context = context(root, id)?;
    ensure_files(&context)?;
    let mut index = read_index(root)?;
    let session = if let Some(existing) = index.sessions.iter().find(|item| item.id == id) {
        existing.clone()
    } else {
        let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let created = SessionMeta {
            id: id.to_string(),
            title: title.to_string(),
            created_at: now.clone(),
            updated_at: now,
            message_count: 0,
            preview: String::new(),
        };
        index.sessions.push(created.clone());
        write_index(root, &mut index)?;
        created
    };
    write_json(&root.join("active.json"), &ActiveId { id: id.to_string() })?;
    Ok(session)
}

pub fn list(root: &Path) -> AppResult<(Vec<SessionMeta>, String)> {
    let id = active_id(root)?;
    ensure(root, &id, "默认会话")?;
    Ok((read_index(root)?.sessions, active_id(root)?))
}

pub fn update_meta(root: &Path, id: &str, messages: &[Value], preview: String) -> AppResult<()> {
    let mut index = read_index(root)?;
    if !index.sessions.iter().any(|item| item.id == id) {
        let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        index.sessions.push(SessionMeta {
            id: id.to_string(),
            title: "默认会话".to_string(),
            created_at: now.clone(),
            updated_at: now,
            message_count: 0,
            preview: String::new(),
        });
    }
    let session = index
        .sessions
        .iter_mut()
        .find(|item| item.id == id)
        .unwrap();
    session.updated_at = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    session.message_count = messages.len();
    session.preview = preview;
    write_index(root, &mut index)
}
