"""Service-C entrypoint."""

import asyncio
import logging

from .consumer import run_consumer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] service-c: %(message)s",
)

if __name__ == "__main__":
    asyncio.run(run_consumer())
