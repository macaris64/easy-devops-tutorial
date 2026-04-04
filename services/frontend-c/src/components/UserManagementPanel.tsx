import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import type { CreatedUser, RoleOption, UserListFilters } from "../types";
import { UserCreateForm } from "./UserCreateForm";
import { UserListTable } from "./UserListTable";
import { UserSummary } from "./UserSummary";

export interface UserManagementPanelProps {
  title?: string;
  createUser: (username: string, email: string) => Promise<CreatedUser>;
  listUsers?: (filters?: UserListFilters) => Promise<CreatedUser[]>;
  updateUser?: (
    id: string,
    patch: { username?: string; email?: string },
  ) => Promise<CreatedUser>;
  deleteUser?: (id: string) => Promise<void>;
  /** Load role id/name pairs for assign/remove UI (admin). */
  listRoles?: () => Promise<RoleOption[]>;
  assignUserRole?: (userId: string, roleId: string) => Promise<void>;
  removeUserRole?: (userId: string, roleId: string) => Promise<void>;
}

/**
 * User management: create form and optional list / edit / delete when callbacks are provided.
 */
export function UserManagementPanel({
  title = "User management",
  createUser,
  listUsers,
  updateUser,
  deleteUser,
  listRoles,
  assignUserRole,
  removeUserRole,
}: UserManagementPanelProps): ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUser, setLastUser] = useState<CreatedUser | null>(null);
  const [rows, setRows] = useState<CreatedUser[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [busyRoleUserId, setBusyRoleUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [listFilters, setListFilters] = useState<UserListFilters>({});
  const [qInput, setQInput] = useState("");
  const [roleFilterInput, setRoleFilterInput] = useState("");

  const reloadList = useCallback(async () => {
    if (!listUsers) {
      return;
    }
    setListError(null);
    try {
      const next = await listUsers(listFilters);
      setRows(next);
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : "Failed to load users");
    }
  }, [listUsers, listFilters]);

  useEffect(() => {
    if (!listUsers) {
      return;
    }
    void reloadList();
  }, [listUsers, reloadList]);

  const roleManagementEnabled =
    Boolean(listRoles) &&
    Boolean(assignUserRole) &&
    Boolean(removeUserRole) &&
    Boolean(listUsers);

  useEffect(() => {
    if (!roleManagementEnabled || !listRoles) {
      return;
    }
    setRolesError(null);
    void listRoles()
      .then((r) => {
        setRoleOptions(r);
      })
      .catch((e: unknown) => {
        setRolesError(e instanceof Error ? e.message : "Failed to load roles");
      });
  }, [listRoles, roleManagementEnabled]);

  const handleAssignRole = useCallback(
    async (userId: string, roleId: string) => {
      if (!assignUserRole) {
        return;
      }
      setBusyRoleUserId(userId);
      setListError(null);
      try {
        await assignUserRole(userId, roleId);
        await reloadList();
      } catch (e: unknown) {
        setListError(e instanceof Error ? e.message : "Assign role failed");
      } finally {
        setBusyRoleUserId(null);
      }
    },
    [assignUserRole, reloadList],
  );

  const handleRemoveRole = useCallback(
    async (userId: string, roleId: string) => {
      if (!removeUserRole) {
        return;
      }
      setBusyRoleUserId(userId);
      setListError(null);
      try {
        await removeUserRole(userId, roleId);
        await reloadList();
      } catch (e: unknown) {
        setListError(e instanceof Error ? e.message : "Remove role failed");
      } finally {
        setBusyRoleUserId(null);
      }
    },
    [removeUserRole, reloadList],
  );

  const handleSubmit = useCallback(
    async (payload: { username: string; email: string }) => {
      setError(null);
      setBusy(true);
      try {
        const created = await createUser(payload.username, payload.email);
        setLastUser(created);
        await reloadList();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "User creation failed";
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [createUser, reloadList],
  );

  const handleEditSave = useCallback(
    async (id: string) => {
      if (!updateUser) {
        return;
      }
      const name = editUsername.trim();
      if (!name) {
        return;
      }
      setBusyUserId(id);
      setListError(null);
      try {
        await updateUser(id, { username: name });
        setEditingUserId(null);
        await reloadList();
      } catch (e: unknown) {
        setListError(e instanceof Error ? e.message : "Update failed");
      } finally {
        setBusyUserId(null);
      }
    },
    [editUsername, reloadList, updateUser],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!deleteUser) {
        return;
      }
      setBusyUserId(id);
      setListError(null);
      try {
        await deleteUser(id);
        await reloadList();
      } catch (e: unknown) {
        setListError(e instanceof Error ? e.message : "Delete failed");
      } finally {
        setBusyUserId(null);
      }
    },
    [deleteUser, reloadList],
  );

  const showTable = Boolean(listUsers);

  return (
    <section className="user-management-panel" data-testid="user-management-panel">
      <h2>{title}</h2>
      <UserCreateForm
        onSubmit={handleSubmit}
        disabled={busy}
        errorMessage={error}
      />
      <UserSummary user={lastUser} />
      {showTable ? (
        <div className="user-management-list" data-testid="user-management-list">
          <h3>Directory</h3>
          <div className="user-panel-toolbar" data-testid="user-list-filters">
            <label>
              Search
              <input
                type="search"
                value={qInput}
                placeholder="Username or email"
                data-testid="user-filter-q"
                onChange={(e) => {
                  setQInput(e.target.value);
                }}
              />
            </label>
            <label>
              Role
              {roleManagementEnabled && roleOptions.length > 0 ? (
                <select
                  value={roleFilterInput}
                  data-testid="user-filter-role"
                  onChange={(e) => {
                    setRoleFilterInput(e.target.value);
                  }}
                >
                  <option value="">Any</option>
                  {roleOptions.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={roleFilterInput}
                  placeholder="Role name"
                  data-testid="user-filter-role"
                  onChange={(e) => {
                    setRoleFilterInput(e.target.value);
                  }}
                />
              )}
            </label>
            <div className="user-panel-toolbar-actions">
              <button
                type="button"
                data-testid="user-filter-apply"
                onClick={() => {
                  const f: UserListFilters = {};
                  if (qInput.trim() !== "") {
                    f.query = qInput.trim();
                  }
                  if (roleFilterInput.trim() !== "") {
                    f.role = roleFilterInput.trim();
                  }
                  setListFilters(f);
                }}
              >
                Apply filters
              </button>
            </div>
          </div>
          {listError ? (
            <p className="form-error" role="alert" data-testid="user-list-error">
              {listError}
            </p>
          ) : null}
          {rolesError ? (
            <p className="form-error" role="alert" data-testid="roles-load-error">
              {rolesError}
            </p>
          ) : null}
          <UserListTable
            users={rows}
            busyUserId={busyUserId}
            editingUserId={editingUserId}
            editUsername={editUsername}
            roleOptions={roleManagementEnabled ? roleOptions : undefined}
            busyRoleUserId={busyRoleUserId}
            onAssignRole={roleManagementEnabled ? handleAssignRole : undefined}
            onRemoveRole={roleManagementEnabled ? handleRemoveRole : undefined}
            onEditStart={
              updateUser
                ? (u) => {
                    setEditingUserId(u.id);
                    setEditUsername(u.username);
                  }
                : undefined
            }
            onEditChange={setEditUsername}
            onEditSave={
              updateUser
                ? (id) => {
                    void handleEditSave(id);
                  }
                : undefined
            }
            onEditCancel={
              updateUser
                ? () => {
                    setEditingUserId(null);
                  }
                : undefined
            }
            onDelete={
              deleteUser
                ? (id) => {
                    void handleDelete(id);
                  }
                : undefined
            }
          />
        </div>
      ) : null}
    </section>
  );
}
