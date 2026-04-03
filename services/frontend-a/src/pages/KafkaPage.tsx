import type { ReactElement } from "react";

function pickEnv(
  value: string | undefined,
  fallback: string,
): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

/**
 * Kafka is inspected via Kafka UI (separate app). This page links there and
 * documents the default user-created topic for local stacks.
 */
export function KafkaPage(): ReactElement {
  const kafkaUiUrl = pickEnv(
    import.meta.env.VITE_KAFKA_UI_URL,
    "http://localhost:8080",
  );
  const topic = pickEnv(
    import.meta.env.VITE_USER_CREATED_TOPIC,
    "user.created",
  );

  return (
    <section>
      <h1>Kafka</h1>
      <p>
        Browse topics, consumer groups, and messages in{" "}
        <strong>Kafka UI</strong> (not embedded here — opens in a new tab).
      </p>
      <p>
        <a href={kafkaUiUrl} target="_blank" rel="noopener noreferrer">
          Open Kafka UI
        </a>
      </p>
      <h2>User events topic</h2>
      <p>
        Service-B publishes JSON payloads to topic <code>{topic}</code> when a
        user is created (see API documentation). Service-C consumes matching
        topics per its configuration.
      </p>
    </section>
  );
}
