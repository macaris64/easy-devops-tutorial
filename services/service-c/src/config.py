"""Environment-driven Kafka consumer settings."""

from __future__ import annotations

import os


def parse_brokers(raw: str) -> list[str]:
    return [b.strip() for b in raw.split(",") if b.strip()]


def normalize_topic_pattern(raw: str | None) -> str:
    """Return a safe regex; empty / * / all → match every application topic name."""
    s = (raw or "").strip()
    if s == "" or s.lower() in ("*", "all"):
        return ".*"
    return s


def env_bool(key: str, *, default: bool) -> bool:
    raw = os.environ.get(key)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() not in ("0", "false", "no", "off")


def load_consumer_settings() -> dict[str, str | list[str] | bool | int]:
    brokers_raw = os.environ.get("KAFKA_BROKERS", "localhost:9092")
    return {
        "brokers": parse_brokers(brokers_raw),
        "group_id": os.environ.get("KAFKA_GROUP_ID", "service-c-all-topics"),
        "topic_pattern": normalize_topic_pattern(os.environ.get("KAFKA_TOPIC_PATTERN")),
        "auto_offset_reset": os.environ.get("KAFKA_AUTO_OFFSET_RESET", "earliest"),
        # List all non-internal topics at startup and subscribe by name (not only a single topic).
        "discover_all_topics": env_bool("KAFKA_DISCOVER_ALL_TOPICS", default=True),
        "metadata_max_age_ms": int(
            os.environ.get("KAFKA_METADATA_MAX_AGE_MS", "30000"),
        ),
    }
