use crate::model_http::{stream_request, validate_request, ModelRequest, ModelStreamEvent};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::thread;
use tokio::sync::watch;

fn request(url: String) -> ModelRequest {
    ModelRequest {
        request_id: "request-1".to_string(),
        url,
        method: "POST".to_string(),
        headers: HashMap::from([("content-type".to_string(), "application/json".to_string())]),
        body: "{}".to_string(),
    }
}

fn test_server(body: &'static str) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut input = [0_u8; 4096];
        let _ = stream.read(&mut input);
        write!(
            stream,
            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\n\r\n{}",
            body.len(),
            body
        )
        .unwrap();
    });
    format!("http://{address}/v1/chat/completions")
}

#[test]
fn model_request_rejects_unsafe_inputs() {
    let mut value = request("file:///tmp/model".to_string());
    assert_eq!(
        validate_request(&value).unwrap_err(),
        "Model URL must be an HTTP URL without credentials"
    );
    value.url = "https://example.com".to_string();
    value
        .headers
        .insert("cookie".to_string(), "x=1".to_string());
    assert!(validate_request(&value)
        .unwrap_err()
        .contains("Unsupported model request header"));
}

#[tokio::test]
async fn model_request_streams_response_bytes() {
    let body = "data: {\"choices\":[]}\n\n";
    let client = reqwest::Client::new();
    let (_sender, mut cancel) = watch::channel(false);
    let mut events = Vec::new();
    stream_request(&client, request(test_server(body)), &mut cancel, |event| {
        events.push(event);
        Ok(())
    })
    .await
    .unwrap();
    assert!(matches!(
        events.first(),
        Some(ModelStreamEvent::Response { status: 200 })
    ));
    let streamed = events
        .iter()
        .filter_map(|event| match event {
            ModelStreamEvent::Chunk { bytes } => Some(bytes.as_slice()),
            _ => None,
        })
        .flatten()
        .copied()
        .collect::<Vec<_>>();
    assert_eq!(String::from_utf8(streamed).unwrap(), body);
    assert!(matches!(events.last(), Some(ModelStreamEvent::Done)));
}

#[tokio::test]
async fn model_request_honors_preflight_cancellation() {
    let client = reqwest::Client::new();
    let (sender, mut cancel) = watch::channel(false);
    sender.send(true).unwrap();
    let mut events = Vec::new();
    stream_request(
        &client,
        request("http://127.0.0.1:9".to_string()),
        &mut cancel,
        |event| {
            events.push(event);
            Ok(())
        },
    )
    .await
    .unwrap();
    assert!(matches!(events.as_slice(), [ModelStreamEvent::Aborted]));
}
