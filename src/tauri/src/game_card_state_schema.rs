use serde_json::Value;

const VALID_TYPES: [&str; 6] = ["string", "number", "boolean", "object", "array", "enum"];

fn schema_map(value: &Value) -> Option<&serde_json::Map<String, Value>> {
    let object = value.as_object()?;
    object
        .get("schema")
        .and_then(Value::as_object)
        .or(Some(object))
}

fn valid_default(value: &Value, definition: &Value) -> Option<&'static str> {
    match definition.get("type").and_then(Value::as_str) {
        Some("string") if !value.is_string() => Some("must be a string"),
        Some("number") if !value.is_number() => Some("must be a finite number"),
        Some("boolean") if !value.is_boolean() => Some("must be a boolean"),
        Some("object") if !value.is_object() => Some("must be an object"),
        Some("array") if !value.is_array() => Some("must be an array"),
        Some("enum")
            if !definition["values"]
                .as_array()
                .is_some_and(|items| items.contains(value)) =>
        {
            Some("must be one of enum values")
        }
        _ => None,
    }
}

pub fn validate_state_schema(value: &Value) -> Vec<String> {
    let Some(schema) = schema_map(value) else {
        return vec!["state schema must be an object".to_string()];
    };
    let mut errors = Vec::new();
    for (path, definition) in schema {
        if path.is_empty() || path.split('.').any(str::is_empty) {
            errors.push(format!("schema.{path}: path must be a non-empty dot path"));
            continue;
        }
        let Some(object) = definition.as_object() else {
            errors.push(format!("schema.{path}: definition must be an object"));
            continue;
        };
        if let Some(kind) = object.get("type").and_then(Value::as_str) {
            if !VALID_TYPES.contains(&kind) {
                errors.push(format!("schema.{path}.type: unsupported type"));
                continue;
            }
            if kind == "enum"
                && !object
                    .get("values")
                    .and_then(Value::as_array)
                    .is_some_and(|v| !v.is_empty())
            {
                errors.push(format!(
                    "schema.{path}.values: enum requires non-empty values"
                ));
                continue;
            }
        }
        if let Some(default) = object.get("default") {
            if let Some(message) = valid_default(default, definition) {
                errors.push(format!("schema.{path}.default: {message}"));
                continue;
            }
            if let Some(number) = default.as_f64() {
                if object
                    .get("min")
                    .and_then(Value::as_f64)
                    .is_some_and(|min| number < min)
                {
                    errors.push(format!(
                        "schema.{path}.default: must be >= {}",
                        object["min"]
                    ));
                } else if object
                    .get("max")
                    .and_then(Value::as_f64)
                    .is_some_and(|max| number > max)
                {
                    errors.push(format!(
                        "schema.{path}.default: must be <= {}",
                        object["max"]
                    ));
                }
            }
        }
    }
    errors
}
