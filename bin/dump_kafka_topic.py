#!/usr/bin/env python3
"""
Consume from a Kafka topic and print each message to stdout.
Uses a random consumer group so this script does not steal messages from other consumers (e.g. telegram_consumers).
Usage: dump_kafka_topic.py <topic> [bootstrap_servers]
  topic: e.g. alerts, trades
  bootstrap_servers: optional; default from KAFKA_BOOTSTRAP_SERVERS or localhost:29092
"""
from __future__ import annotations

import asyncio
import os
import random
import string
import sys


def main():
    if len(sys.argv) < 2:
        print("Usage: dump_kafka_topic.py <topic> [bootstrap_servers]", file=sys.stderr)
        print("  topic: e.g. alerts, trades", file=sys.stderr)
        sys.exit(1)
    topic = sys.argv[1].strip()
    bootstrap = (
        sys.argv[2].strip()
        if len(sys.argv) > 2
        else os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:29092").strip()
    )
    group_id = "dump_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))

    try:
        from aiokafka import AIOKafkaConsumer
    except ImportError:
        print("Install aiokafka: pip install aiokafka", file=sys.stderr)
        sys.exit(1)

    async def run():
        consumer = AIOKafkaConsumer(
            topic,
            bootstrap_servers=bootstrap,
            group_id=group_id,
            value_deserializer=lambda m: m.decode("utf-8") if m else None,
        )
        await consumer.start()
        print(f"Consuming topic={topic} from {bootstrap} (group={group_id}). Stop with Ctrl+C.", file=sys.stderr)
        try:
            async for msg in consumer:
                if msg.value is not None:
                    print(msg.value)
        finally:
            await consumer.stop()

    asyncio.run(run())


if __name__ == "__main__":
    main()
