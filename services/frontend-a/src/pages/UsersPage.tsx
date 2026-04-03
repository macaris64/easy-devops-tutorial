import type { ReactElement } from "react";
import { UserManagementPanel } from "@easy-devops/user-panel";
import { createUser } from "../api/gateway";

export function UsersPage(): ReactElement {
  return (
    <section>
      <h1>Users</h1>
      <UserManagementPanel createUser={createUser} />
    </section>
  );
}
