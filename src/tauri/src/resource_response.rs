use crate::app_storage::AppStorage;
use crate::resource_assets::{resolve_resource, ResourceAsset};
use percent_encoding::percent_decode_str;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use tauri::http::{header, Method, Request, Response, StatusCode};

const MAX_RANGE_BYTES: u64 = 1_000 * 1024;

fn response(status: StatusCode, body: Vec<u8>) -> Response<Vec<u8>> {
    Response::builder()
        .status(status)
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(body)
        .expect("static resource response must be valid")
}

fn decode_virtual_path(request: &Request<Vec<u8>>) -> Result<String, String> {
    if request.uri().query().is_some()
        || !matches!(request.uri().host(), Some("localhost" | "local.localhost"))
    {
        return Err("Invalid local resource URL".to_string());
    }
    percent_decode_str(request.uri().path().trim_start_matches('/'))
        .decode_utf8()
        .map(|value| value.into_owned())
        .map_err(|_| "Invalid local resource URL encoding".to_string())
}

fn parse_range(value: &str, length: u64) -> Option<(u64, u64)> {
    let range = value.strip_prefix("bytes=")?;
    if range.contains(',') || length == 0 {
        return None;
    }
    let (start, end) = range.split_once('-')?;
    if start.is_empty() {
        let suffix = end.parse::<u64>().ok()?;
        return (suffix > 0).then(|| (length.saturating_sub(suffix), length - 1));
    }
    let start = start.parse::<u64>().ok()?;
    let end = if end.is_empty() {
        length - 1
    } else {
        end.parse::<u64>().ok()?.min(length - 1)
    };
    (start < length && start <= end).then_some((start, end))
}

fn read_bytes(asset: &ResourceAsset, start: u64, length: u64) -> Result<Vec<u8>, String> {
    let mut file = File::open(&asset.path).map_err(|error| error.to_string())?;
    file.seek(SeekFrom::Start(start))
        .map_err(|error| error.to_string())?;
    let mut bytes = Vec::with_capacity(length as usize);
    file.take(length)
        .read_to_end(&mut bytes)
        .map_err(|error| error.to_string())?;
    Ok(bytes)
}

fn asset_response(
    request: &Request<Vec<u8>>,
    asset: ResourceAsset,
) -> Result<Response<Vec<u8>>, String> {
    let length = asset
        .path
        .metadata()
        .map_err(|error| error.to_string())?
        .len();
    let mut builder = Response::builder()
        .header(header::CONTENT_TYPE, asset.mime)
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*");
    if asset.audio {
        builder = builder.header(header::ACCEPT_RANGES, "bytes").header(
            header::ACCESS_CONTROL_EXPOSE_HEADERS,
            "Content-Range, Accept-Ranges",
        );
    }
    if request.method() == Method::HEAD {
        return builder
            .header(header::CONTENT_LENGTH, length)
            .body(Vec::new())
            .map_err(|error| error.to_string());
    }
    if asset.audio {
        if let Some(value) = request.headers().get(header::RANGE) {
            let parsed = value
                .to_str()
                .ok()
                .and_then(|value| parse_range(value, length));
            let Some((start, requested_end)) = parsed else {
                let mut result = response(StatusCode::RANGE_NOT_SATISFIABLE, Vec::new());
                result.headers_mut().insert(
                    header::CONTENT_RANGE,
                    format!("bytes */{length}")
                        .parse()
                        .expect("valid range header"),
                );
                result.headers_mut().insert(
                    header::ACCEPT_RANGES,
                    "bytes".parse().expect("valid header"),
                );
                return Ok(result);
            };
            let end = requested_end.min(start.saturating_add(MAX_RANGE_BYTES - 1));
            let bytes = read_bytes(&asset, start, end - start + 1)?;
            return builder
                .status(StatusCode::PARTIAL_CONTENT)
                .header(
                    header::CONTENT_RANGE,
                    format!("bytes {start}-{end}/{length}"),
                )
                .header(header::CONTENT_LENGTH, bytes.len())
                .body(bytes)
                .map_err(|error| error.to_string());
        }
    }
    let bytes = read_bytes(&asset, 0, length)?;
    builder
        .header(header::CONTENT_LENGTH, bytes.len())
        .body(bytes)
        .map_err(|error| error.to_string())
}

pub fn handle_resource_request(
    storage: &AppStorage,
    request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    if !matches!(*request.method(), Method::GET | Method::HEAD) {
        return response(StatusCode::METHOD_NOT_ALLOWED, Vec::new());
    }
    let result = decode_virtual_path(&request)
        .and_then(|path| resolve_resource(storage, &path))
        .and_then(|asset| asset_response(&request, asset));
    result.unwrap_or_else(|_| response(StatusCode::NOT_FOUND, Vec::new()))
}
