import type { ReactElement } from "react";

export function HomePage(): ReactElement {
  return (
    <section>
      <h1>Admin dashboard</h1>
      <p>
        Manage users and inspect audit logs. Microfrontend components are
        provided by the user panel and log panel packages.
      </p>
    </section>
  );
}
