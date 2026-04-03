from __future__ import annotations

from typing import Any

import pytest
from src.consumer import default_process_message, run_consumer


class _FakeMsg:
    def __init__(self) -> None:
        self.topic = "user.created"
        self.partition = 0
        self.offset = 42
        self.key = b"uid"
        self.value = b'{"event":"user.created"}'


class _FakeConsumer:
    def __init__(self, *_a: Any, **_kw: Any) -> None:
        self._msg = _FakeMsg()

    def subscribe(self, pattern: str | None = None) -> None:
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
    assert seen[0][0] == "user.created"
    assert seen[0][3] == "uid"


@pytest.mark.asyncio
async def test_run_consumer_handler_error_continues(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("KAFKA_BROKERS", "localhost:9092")

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
async def test_default_process_message_logs(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    import logging

    caplog.set_level(logging.INFO)
    await default_process_message("t", 0, 1, "k", "v")
    assert "topic=t" in caplog.text
