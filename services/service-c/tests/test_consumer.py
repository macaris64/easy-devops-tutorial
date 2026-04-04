from __future__ import annotations

from typing import Any

import pytest
from src.consumer import default_process_message, list_public_topics, run_consumer


class _FakeMsg:
    def __init__(self) -> None:
        self.topic = "user.events"
        self.partition = 0
        self.offset = 42
        self.key = b"uid"
        self.value = b'{"event":"user","data":"user.created"}'


class _FakeConsumer:
    def __init__(self, *_a: Any, **_kw: Any) -> None:
        self._msg = _FakeMsg()
        self.subscribed_topics: list[str] | None = None
        self.pattern: str | None = None

    def subscribe(
        self,
        topics: tuple[str, ...] | list[str] = (),
        pattern: str | None = None,
        listener: Any = None,
    ) -> None:
        if topics:
            self.subscribed_topics = list(topics)
        if pattern is not None:
            self.pattern = pattern

    async def start(self) -> None:
        self.started = True

    async def stop(self) -> None:
        self.stopped = True

    def __aiter__(self) -> _FakeConsumer:
        self._done = False
        return self

    async def __anext__(self) -> _FakeMsg:
        if self._done:
            raise StopAsyncIteration
        self._done = True
        return self._msg


@pytest.mark.asyncio
async def test_run_consumer_processes_one_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("KAFKA_BROKERS", "localhost:9092")
    monkeypatch.setenv("KAFKA_GROUP_ID", "test-group")
    monkeypatch.setenv("KAFKA_TOPIC_PATTERN", ".*")
    monkeypatch.setenv("KAFKA_DISCOVER_ALL_TOPICS", "0")
    seen: list[tuple[Any, ...]] = []

    async def proc(
        topic: str,
        partition: int,
        offset: int,
        key: str | None,
        body: str,
    ) -> None:
        seen.append((topic, partition, offset, key, body))

    await run_consumer(
        process_message=proc,
        consumer_factory=_FakeConsumer,
    )
    assert len(seen) == 1
    assert seen[0][0] == "user.events"
    assert seen[0][3] == "uid"


@pytest.mark.asyncio
async def test_run_consumer_handler_error_continues(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("KAFKA_BROKERS", "localhost:9092")
    monkeypatch.setenv("KAFKA_DISCOVER_ALL_TOPICS", "0")

    class _TwoMsgConsumer(_FakeConsumer):
        def __init__(self, *_a: Any, **_kw: Any) -> None:
            super().__init__()
            self._count = 0

        async def __anext__(self) -> _FakeMsg:
            self._count += 1
            if self._count > 2:
                raise StopAsyncIteration
            return _FakeMsg()

    calls = 0

    async def boom(*_a: Any, **_kw: Any) -> None:
        nonlocal calls
        calls += 1
        raise RuntimeError("handler fail")

    await run_consumer(
        process_message=boom,
        consumer_factory=_TwoMsgConsumer,
    )
    assert calls == 2


@pytest.mark.asyncio
async def test_list_public_topics_excludes_internal_and_sorts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import src.consumer as consumer_mod

    class _FakeAdmin:
        def __init__(self, *_a: Any, **_kw: Any) -> None:
            pass

        async def start(self) -> None:
            pass

        async def close(self) -> None:
            pass

        async def list_topics(self) -> list[str]:
            return ["__consumer_offsets", "zebra", "alpha"]

    monkeypatch.setattr(consumer_mod, "AIOKafkaAdminClient", _FakeAdmin)
    out = await list_public_topics(["localhost:9092"])
    assert out == ["alpha", "zebra"]


@pytest.mark.asyncio
async def test_run_consumer_discovery_subscribes_to_topic_list(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import src.consumer as consumer_mod

    monkeypatch.setenv("KAFKA_BROKERS", "localhost:9092")
    monkeypatch.setenv("KAFKA_GROUP_ID", "test-group")
    monkeypatch.setenv("KAFKA_DISCOVER_ALL_TOPICS", "1")

    async def fake_list(_brokers: list[str]) -> list[str]:
        return ["role.events", "user.events"]

    monkeypatch.setattr(consumer_mod, "list_public_topics", fake_list)

    c: _FakeConsumer | None = None

    def factory(*a: Any, **kw: Any) -> _FakeConsumer:
        nonlocal c
        c = _FakeConsumer(*a, **kw)
        return c

    await run_consumer(consumer_factory=factory)
    assert c is not None
    assert c.subscribed_topics == ["role.events", "user.events"]
    assert c.pattern is None


@pytest.mark.asyncio
async def test_run_consumer_discovery_failure_falls_back_to_pattern(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import src.consumer as consumer_mod

    monkeypatch.setenv("KAFKA_BROKERS", "localhost:9092")
    monkeypatch.setenv("KAFKA_TOPIC_PATTERN", r"events\..*")
    monkeypatch.setenv("KAFKA_DISCOVER_ALL_TOPICS", "1")

    async def boom(_brokers: list[str]) -> list[str]:
        raise RuntimeError("kafka down")

    monkeypatch.setattr(consumer_mod, "list_public_topics", boom)

    c: _FakeConsumer | None = None

    def factory(*a: Any, **kw: Any) -> _FakeConsumer:
        nonlocal c
        c = _FakeConsumer(*a, **kw)
        return c

    await run_consumer(consumer_factory=factory)
    assert c is not None
    assert c.subscribed_topics is None
    assert c.pattern == r"events\..*"


@pytest.mark.asyncio
async def test_run_consumer_discovery_empty_uses_pattern(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import src.consumer as consumer_mod

    monkeypatch.setenv("KAFKA_BROKERS", "localhost:9092")
    monkeypatch.setenv("KAFKA_TOPIC_PATTERN", ".*")
    monkeypatch.setenv("KAFKA_DISCOVER_ALL_TOPICS", "1")

    async def empty(_brokers: list[str]) -> list[str]:
        return []

    monkeypatch.setattr(consumer_mod, "list_public_topics", empty)

    c: _FakeConsumer | None = None

    def factory(*a: Any, **kw: Any) -> _FakeConsumer:
        nonlocal c
        c = _FakeConsumer(*a, **kw)
        return c

    await run_consumer(consumer_factory=factory)
    assert c is not None
    assert c.subscribed_topics is None
    assert c.pattern == ".*"


@pytest.mark.asyncio
async def test_default_process_message_logs(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    import logging

    caplog.set_level(logging.INFO)
    await default_process_message("t", 0, 1, "k", "v")
    assert "topic=t" in caplog.text
