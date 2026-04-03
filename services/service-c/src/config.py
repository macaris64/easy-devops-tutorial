"""Environment-driven Kafka consumer settings."""

from __future__ import annotations

import os


def parse_brokers(raw: str) -> list[str]:
    return [b.strip() for b in raw.split(",") if b.strip()]


def load_consumer_settings() -> dict[str, str | list[str]]:
    brokers_raw = os.environ.get("KAFKA_BROKERS", "localhost:9092")
    return {
        "brokers": parse_brokers(brokers_raw),
        "group_id": os.environ.get("KAFKA_GROUP_ID", "service-c-all-topics"),
        "topic_pattern": os.environ.get("KAFKA_TOPIC_PATTERN", ".*"),
        "auto_offset_reset": os.environ.get("KAFKA_AUTO_OFFSET_RESET", "earliest"),
    }
