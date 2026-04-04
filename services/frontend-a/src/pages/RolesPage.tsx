import { RoleManagementPanel } from "@easy-devops/user-panel";
import type { ReactElement } from "react";
import {
  createRole,
  deleteRole as apiDeleteRole,
  listRoles,
  updateRole as apiUpdateRole,
} from "../api/gateway";
import { useAuth } from "../auth/AuthContext";

export function RolesPage(): ReactElement {
  const { isAdmin } = useAuth();

  return (
    <section
      className="roles-page page-section"
      data-testid="roles-page"
      aria-labelledby="roles-heading"
    >
      <h1 id="roles-heading">Roles</h1>
      {isAdmin ? (
        <div className="roles-page-admin" data-testid="roles-page-admin">
          <RoleManagementPanel
            listRoles={listRoles}
            createRole={createRole}
            updateRole={apiUpdateRole}
            deleteRole={apiDeleteRole}
          />
        </div>
      ) : (
        <p className="users-admin-only" data-testid="roles-admin-only">
          Role management is restricted to administrators.
        </p>
      )}
    </section>
  );
}
