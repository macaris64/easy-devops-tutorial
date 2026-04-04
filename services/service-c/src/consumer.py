"""Kafka consumer loop (aiokafka)."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from aiokafka import AIOKafkaConsumer
from aiokafka.admin import AIOKafkaAdminClient

from .config import load_consumer_settings
from .message_format import log_fields_for_message

log = logging.getLogger("service-c")

MessageHandler = Callable[[str, int, int, str | None, str], Awaitable[None]]


async def list_public_topics(brokers: list[str]) -> list[str]:
    """Return sorted non-internal topic names from the cluster."""
    admin = AIOKafkaAdminClient(bootstrap_servers=brokers)
    await admin.start()
    try:
        names = await admin.list_topics()
    finally:
        await admin.close()
    return sorted(t for t in names if not t.startswith("__"))


async def default_process_message(
    topic: str,
    partition: int,
    offset: int,
    key: str | None,
    body: str,
) -> None:
    log.info(
        "topic=%s partition=%s offset=%s key=%s value=%s",
        topic,
        partition,
        offset,
        key,
        body,
    )


async def run_consumer(
    *,
    process_message: MessageHandler | None = None,
    consumer_factory: Callable[..., Any] | None = None,
) -> None:
    settings = load_consumer_settings()
    brokers = settings["brokers"]
    group_id = str(settings["group_id"])
    pattern = str(settings["topic_pattern"])
    auto_offset = str(settings["auto_offset_reset"])
    discover = bool(settings["discover_all_topics"])
    meta_age = int(settings["metadata_max_age_ms"])

    factory = consumer_factory or AIOKafkaConsumer
    consumer = factory(
        bootstrap_servers=brokers,
        group_id=group_id,
        auto_offset_reset=auto_offset,
        enable_auto_commit=True,
        exclude_internal_topics=True,
        metadata_max_age_ms=meta_age,
    )

    if discover:
        try:
            topics = await list_public_topics(brokers)
        except Exception as exc:  # noqa: BLE001
            log.warning("Kafka topic discovery failed, using pattern %r: %s", pattern, exc)
            topics = []
        if topics:
            consumer.subscribe(topics=topics)
            log.info(
                "Kafka subscribed to %d topic(s) (discovery): %s",
                len(topics),
                topics,
            )
        else:
            log.info("Kafka no topics discovered yet; pattern subscription: %s", pattern)
            consumer.subscribe(pattern=pattern)
    else:
        log.info("Kafka pattern subscription: %s", pattern)
        consumer.subscribe(pattern=pattern)

    await consumer.start()
    log.info("Kafka consumer started, brokers=%s", brokers)

    proc: MessageHandler = process_message or default_process_message

    try:
        async for msg in consumer:
            try:
                topic, partition, offset, key, body = log_fields_for_message(
                    msg.topic,
                    msg.partition,
                    msg.offset,
                    msg.key,
                    msg.value,
                )
                await proc(topic, partition, offset, key, body)
            except Exception as exc:  # noqa: BLE001
                log.exception("message handler error: %s", exc)
    finally:
        await consumer.stop()
        log.info("Kafka consumer stopped")
