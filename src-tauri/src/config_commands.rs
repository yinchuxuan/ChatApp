use crate::app_storage::AppStorage;
use crate::json_store::{read_json, write_json, AppResult};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};

const BACKGROUND_EVENT: &str = "background-config-changed";

fn public_background(mut config: Value) -> Value {
    if let Some(object) = config.as_object_mut() {
        object.remove("backgroundImagePath");
    }
    config
}

pub(crate) async fn load_model(storage: &AppStorage) -> AppResult<Value> {
    let path = storage.model_config_path();
    let _guard = storage.lock(&path).await;
    Ok(read_json(&path)?.unwrap_or_else(|| {
        json!({
            "apiUrl": "", "apiKey": "", "modelName": ""
        })
    }))
}

pub(crate) async fn save_model(storage: &AppStorage, config: Value) -> AppResult<Value> {
    let path = storage.model_config_path();
    let _guard = storage.lock(&path).await;
    write_json(&path, &config)?;
    Ok(config)
}

pub(crate) async fn load_background(storage: &AppStorage) -> AppResult<Value> {
    let path = storage.background_config_path();
    let _guard = storage.lock(&path).await;
    let config = read_json(&path)?.unwrap_or_else(|| {
        json!({
            "backgroundImageUrl": "", "backgroundOpacity": 0.5
        })
    });
    Ok(public_background(config))
}

pub(crate) async fn save_background(storage: &AppStorage, config: Value) -> AppResult<Value> {
    let path = storage.background_config_path();
    let _guard = storage.lock(&path).await;
    let visible = public_background(config);
    let local_url = visible.get("backgroundImageUrl").and_then(Value::as_str);
    if local_url.is_some_and(|url| url.starts_with("local://")) {
        return Err("Local background URL is not authorized".to_string());
    }
    write_json(&path, &visible)?;
    Ok(visible)
}

#[tauri::command]
pub async fn get_model_config(state: State<'_, AppStorage>) -> AppResult<Value> {
    load_model(&state).await
}

#[tauri::command]
pub async fn save_model_config(state: State<'_, AppStorage>, config: Value) -> AppResult<Value> {
    save_model(&state, config).await
}

#[tauri::command]
pub async fn get_background_config(state: State<'_, AppStorage>) -> AppResult<Value> {
    load_background(&state).await
}

#[tauri::command]
pub async fn save_background_config(
    app: AppHandle,
    state: State<'_, AppStorage>,
    config: Value,
) -> AppResult<Value> {
    let saved = save_background(&state, config).await?;
    app.emit(BACKGROUND_EVENT, &saved)
        .map_err(|error| error.to_string())?;
    Ok(saved)
}
