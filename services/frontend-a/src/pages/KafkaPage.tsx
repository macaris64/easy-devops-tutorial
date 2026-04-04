import { DomainEventTypeList } from "@easy-devops/log-panel";
import type { ReactElement } from "react";

function pickEnv(
  value: string | undefined,
  fallback: string,
): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

/**
 * Kafka is inspected via Kafka UI (separate app). This page links there and
 * documents domain events for local stacks.
 */
export function KafkaPage(): ReactElement {
  const kafkaUiUrl = pickEnv(
    import.meta.env.VITE_KAFKA_UI_URL,
    "http://localhost:8080",
  );
  const userEventsTopic = pickEnv(
    import.meta.env.VITE_KAFKA_USER_EVENTS_TOPIC,
    "user.events",
  );
  const roleEventsTopic = pickEnv(
    import.meta.env.VITE_KAFKA_ROLE_EVENTS_TOPIC,
    "role.events",
  );

  return (
    <section className="page-section">
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
      <h2>Domain event topics</h2>
      <p>
        Service-B publishes to <code>KAFKA_USER_EVENTS_TOPIC</code> and{" "}
        <code>KAFKA_ROLE_EVENTS_TOPIC</code> (defaults <code>user.events</code> /{" "}
        <code>role.events</code>). This build shows the Vite labels below for quick
        reference.
      </p>
      <ul>
        <li>
          User aggregate: <code>{userEventsTopic}</code>
        </li>
        <li>
          Role aggregate: <code>{roleEventsTopic}</code>
        </li>
      </ul>
      <DomainEventTypeList />
    </section>
  );
}
