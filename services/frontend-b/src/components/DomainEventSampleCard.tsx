import type { ReactElement } from "react";

export interface DomainEventSampleCardProps {
  /** Primary heading (usually the Kafka `data` action, e.g. user.created). */
  title: string;
  /** Short human-readable explanation. */
  description?: string;
  /** Example JSON body as shown in Kafka. */
  example: Record<string, unknown>;
}

export function DomainEventSampleCard({
  title,
  description,
  example,
}: DomainEventSampleCardProps): ReactElement {
  const json = JSON.stringify(example, null, 2);
  return (
    <article
      className="domain-event-sample-card"
      data-testid={`domain-event-card-${title.replace(/\./g, "-")}`}
    >
      <h4>{title}</h4>
      {description ? <p className="domain-event-sample-desc">{description}</p> : null}
      <pre className="domain-event-sample-json">
        <code>{json}</code>
      </pre>
    </article>
  );
}
