use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::watch;

const MAX_BODY_BYTES: usize = 8 * 1024 * 1024;
const ALLOWED_HEADERS: &[&str] = &[
    "authorization",
    "content-type",
    "x-api-key",
    "anthropic-version",
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ModelRequest {
    pub request_id: String,
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub(crate) enum ModelStreamEvent {
    Response { status: u16 },
    Chunk { bytes: Vec<u8> },
    Done,
    Aborted,
    Error { message: String },
}

pub(crate) fn validate_request(request: &ModelRequest) -> Result<(), String> {
    if request.request_id.is_empty()
        || request.request_id.len() > 64
        || !request
            .request_id
            .bytes()
            .all(|value| value.is_ascii_alphanumeric() || b"-_.".contains(&value))
    {
        return Err("Invalid model request id".to_string());
    }
    if request.method != "POST" {
        return Err("Model request method must be POST".to_string());
    }
    if request.body.len() > MAX_BODY_BYTES {
        return Err("Model request body is too large".to_string());
    }
    let url = reqwest::Url::parse(&request.url).map_err(|_| "Invalid model URL".to_string())?;
    if !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("Model URL must be an HTTP URL without credentials".to_string());
    }
    for name in request.headers.keys() {
        if !ALLOWED_HEADERS.contains(&name.to_ascii_lowercase().as_str()) {
            return Err(format!("Unsupported model request header: {name}"));
        }
    }
    Ok(())
}

fn request_headers(values: &HashMap<String, String>) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    for (name, value) in values {
        let name = HeaderName::from_bytes(name.as_bytes()).map_err(|error| error.to_string())?;
        let value = HeaderValue::from_str(value).map_err(|error| error.to_string())?;
        headers.insert(name, value);
    }
    Ok(headers)
}

pub(crate) async fn stream_request<F>(
    client: &reqwest::Client,
    request: ModelRequest,
    cancel: &mut watch::Receiver<bool>,
    mut emit: F,
) -> Result<(), String>
where
    F: FnMut(ModelStreamEvent) -> Result<(), String>,
{
    validate_request(&request)?;
    let pending = client
        .post(&request.url)
        .headers(request_headers(&request.headers)?)
        .body(request.body)
        .send();
    let mut response = tokio::select! {
        result = pending => result.map_err(|error| error.to_string())?,
        _ = cancel.changed() => {
            emit(ModelStreamEvent::Aborted)?;
            return Ok(());
        }
    };
    emit(ModelStreamEvent::Response {
        status: response.status().as_u16(),
    })?;
    loop {
        let chunk = tokio::select! {
            result = response.chunk() => result.map_err(|error| error.to_string())?,
            _ = cancel.changed() => {
                emit(ModelStreamEvent::Aborted)?;
                return Ok(());
            }
        };
        let Some(chunk) = chunk else { break };
        emit(ModelStreamEvent::Chunk {
            bytes: chunk.to_vec(),
        })?;
    }
    emit(ModelStreamEvent::Done)
}
