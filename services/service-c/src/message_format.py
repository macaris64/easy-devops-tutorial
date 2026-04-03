"""Format Kafka records for logging."""

from __future__ import annotations

import json
from typing import Any


def format_message_value(raw: bytes | None) -> str:
    if not raw:
        return ""
    text = raw.decode("utf-8")
    try:
        parsed: Any = json.loads(text)
        return json.dumps(parsed, ensure_ascii=False)
    except json.JSONDecodeError:
        return text


def format_message_key(key: bytes | None) -> str | None:
    if key is None:
        return None
    return key.decode("utf-8")


def log_fields_for_message(
    topic: str,
    partition: int,
    offset: int,
    key: bytes | None,
    value: bytes | None,
) -> tuple[str, int, int, str | None, str]:
    return (
        topic,
        partition,
        offset,
        format_message_key(key),
        format_message_value(value),
    )
