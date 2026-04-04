import type { ReactElement } from "react";

export function HomePage(): ReactElement {
  return (
    <section className="page-section">
      <h1>Admin dashboard</h1>
      <p>
        Create and look up users, inspect HTTP audit logs, and open Kafka UI
        to view topics and messages. Shared UI comes from the user panel and
        log panel packages.
      </p>
    </section>
  );
}
