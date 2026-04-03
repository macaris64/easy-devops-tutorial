import type { ReactElement } from "react";
import { UserManagementPanel } from "@easy-devops/user-panel";
import {
  createUser,
  deleteUser as apiDeleteUser,
  fetchUser,
  listUsers,
  updateUser as apiUpdateUser,
} from "../api/gateway";
import { useAuth } from "../auth/AuthContext";
import { UserLookupSection } from "../components/UserLookupSection";

export function UsersPage(): ReactElement {
  const { isAdmin } = useAuth();

  return (
    <section>
      <h1>Users</h1>
      {isAdmin ? (
        <>
          <UserManagementPanel
            createUser={createUser}
            listUsers={listUsers}
            updateUser={(id: string, patch: { username?: string; email?: string }) =>
              apiUpdateUser(id, patch)
            }
            deleteUser={(id: string) => apiDeleteUser(id).then(() => undefined)}
          />
        </>
      ) : (
        <p className="users-admin-only" data-testid="users-admin-only">
          User management is restricted to administrators. You can still look up a
          user by ID below.
        </p>
      )}
      <UserLookupSection fetchUser={fetchUser} />
    </section>
  );
}
