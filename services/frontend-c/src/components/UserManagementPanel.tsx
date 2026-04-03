import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import type { CreatedUser } from "../types";
import { UserCreateForm } from "./UserCreateForm";
import { UserListTable } from "./UserListTable";
import { UserSummary } from "./UserSummary";

export interface UserManagementPanelProps {
  title?: string;
  createUser: (username: string, email: string) => Promise<CreatedUser>;
  listUsers?: () => Promise<CreatedUser[]>;
  updateUser?: (
    id: string,
    patch: { username?: string; email?: string },
  ) => Promise<CreatedUser>;
  deleteUser?: (id: string) => Promise<void>;
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
}: UserManagementPanelProps): ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUser, setLastUser] = useState<CreatedUser | null>(null);
  const [rows, setRows] = useState<CreatedUser[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");

  const reloadList = useCallback(async () => {
    if (!listUsers) {
      return;
    }
    setListError(null);
    try {
      const next = await listUsers();
      setRows(next);
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : "Failed to load users");
    }
  }, [listUsers]);

  useEffect(() => {
    if (!listUsers) {
      return;
    }
    void reloadList();
  }, [listUsers, reloadList]);

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
          {listError ? (
            <p className="form-error" role="alert" data-testid="user-list-error">
              {listError}
            </p>
          ) : null}
          <UserListTable
            users={rows}
            busyUserId={busyUserId}
            editingUserId={editingUserId}
            editUsername={editUsername}
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
