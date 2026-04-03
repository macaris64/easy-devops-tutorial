import pytest
from src.config import load_consumer_settings, parse_brokers


def test_parse_brokers_trims_and_skips_empty() -> None:
    assert parse_brokers("a, b , ,c") == ["a", "b", "c"]
    assert parse_brokers("") == []


def test_load_consumer_settings_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("KAFKA_BROKERS", raising=False)
    monkeypatch.delenv("KAFKA_GROUP_ID", raising=False)
    monkeypatch.delenv("KAFKA_TOPIC_PATTERN", raising=False)
    monkeypatch.delenv("KAFKA_AUTO_OFFSET_RESET", raising=False)
    s = load_consumer_settings()
    assert s["brokers"] == ["localhost:9092"]
    assert s["group_id"] == "service-c-all-topics"
    assert s["topic_pattern"] == ".*"
    assert s["auto_offset_reset"] == "earliest"


def test_load_consumer_settings_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KAFKA_BROKERS", "k1:9092, k2:9092")
    monkeypatch.setenv("KAFKA_GROUP_ID", "g1")
    monkeypatch.setenv("KAFKA_TOPIC_PATTERN", "events.*")
    monkeypatch.setenv("KAFKA_AUTO_OFFSET_RESET", "latest")
    s = load_consumer_settings()
    assert s["brokers"] == ["k1:9092", "k2:9092"]
    assert s["group_id"] == "g1"
    assert s["topic_pattern"] == "events.*"
    assert s["auto_offset_reset"] == "latest"
