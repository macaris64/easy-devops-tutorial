import json

from src.message_format import (
    format_message_key,
    format_message_value,
    log_fields_for_message,
)


def test_format_message_value_empty() -> None:
    assert format_message_value(None) == ""
    assert format_message_value(b"") == ""


def test_format_message_value_json() -> None:
    raw = b'{"x": 1}'
    out = format_message_value(raw)
    assert json.loads(out) == {"x": 1}


def test_format_message_value_domain_event_payload() -> None:
    """Service-B domain events: aggregate event, data action, timestamp + ids."""
    raw = (
        b'{"event":"user","data":"user.role_assigned","user_id":"u1","role_id":"r2",'
        b'"timestamp":"2026-04-04T12:00:00.000Z"}'
    )
    out = format_message_value(raw)
    parsed = json.loads(out)
    assert parsed["event"] == "user"
    assert parsed["data"] == "user.role_assigned"
    assert parsed["user_id"] == "u1"
    assert parsed["role_id"] == "r2"


def test_format_message_value_plain_text() -> None:
    assert format_message_value(b"not-json") == "not-json"


def test_format_message_key() -> None:
    assert format_message_key(None) is None
    assert format_message_key(b"k") == "k"


def test_log_fields_for_message() -> None:
    t, p, o, k, v = log_fields_for_message("topic-a", 2, 99, b"key", b'{"z":true}')
    assert t == "topic-a" and p == 2 and o == 99 and k == "key"
    assert '"z"' in v
