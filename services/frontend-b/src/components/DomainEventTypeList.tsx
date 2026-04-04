import type { ReactElement } from "react";
import { domainEventCatalog } from "../domainEventCatalog";
import type { DomainEventDoc } from "../types";
import { DomainEventSampleCard } from "./DomainEventSampleCard";

export interface DomainEventTypeListProps {
  /** Override catalog (defaults to bundled Service-B reference). */
  events?: DomainEventDoc[];
}

/**
 * Reference list of JSON domain events published by Service-B to Kafka.
 */
export function DomainEventTypeList({
  events = domainEventCatalog,
}: DomainEventTypeListProps): ReactElement {
  return (
    <div className="domain-event-type-list" data-testid="domain-event-type-list">
      <h3>Domain events (JSON)</h3>
      <p>
        User-aggregate messages go to <code>KAFKA_USER_EVENTS_TOPIC</code> (default{" "}
        <code>user.events</code>); role-aggregate messages to{" "}
        <code>KAFKA_ROLE_EVENTS_TOPIC</code> (default <code>role.events</code>). Each value is JSON
        with aggregate <code>event</code> (<code>user</code> or <code>role</code>), action{" "}
        <code>data</code> (e.g. <code>user.created</code>), UTC <code>timestamp</code>, and
        type-specific ids.
      </p>
      <div className="domain-event-cards">
        {events.map((doc) => (
          <DomainEventSampleCard
            key={doc.event}
            title={doc.event}
            description={doc.description}
            example={doc.example}
          />
        ))}
      </div>
    </div>
  );
}
