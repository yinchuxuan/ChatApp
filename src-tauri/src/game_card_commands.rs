use crate::app_storage::AppStorage;
use crate::game_card_error::{CardResult, GameCardError};
use crate::game_card_repository;
use serde_json::{json, Value};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn get_game_cards(state: State<'_, AppStorage>) -> CardResult<Vec<Value>> {
    game_card_repository::list(&state).await
}

#[tauri::command]
pub async fn get_game_card(state: State<'_, AppStorage>, id: String) -> CardResult<Option<Value>> {
    game_card_repository::get(&state, &id).await
}

#[tauri::command]
pub async fn save_game_card(state: State<'_, AppStorage>, card: Value) -> CardResult<Value> {
    game_card_repository::save(&state, card).await?;
    Ok(json!({}))
}

#[tauri::command]
pub async fn import_game_card_from_directory(
    app: AppHandle,
    state: State<'_, AppStorage>,
) -> CardResult<Value> {
    let selected = app
        .dialog()
        .file()
        .blocking_pick_folder()
        .ok_or_else(GameCardError::canceled)?;
    let path = selected
        .into_path()
        .map_err(|error| GameCardError::new(error.to_string()))?;
    game_card_repository::import(&state, &path).await
}

#[tauri::command]
pub async fn set_active_game_card(
    state: State<'_, AppStorage>,
    id: Option<String>,
) -> CardResult<Value> {
    game_card_repository::set_active(&state, id.as_deref()).await?;
    Ok(json!({}))
}

#[tauri::command]
pub async fn get_active_game_card(state: State<'_, AppStorage>) -> CardResult<Option<Value>> {
    game_card_repository::active(&state).await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn read_game_card_file(
    state: State<'_, AppStorage>,
    card_id: String,
    relative_path: String,
) -> CardResult<String> {
    game_card_repository::read_text(&state, &card_id, &relative_path).await
}
