import type { ReactElement } from "react";
import type { CreatedUser } from "../types";

export interface UserListTableProps {
  users: CreatedUser[];
  busyUserId?: string | null;
  editingUserId?: string | null;
  editUsername?: string;
  onEditStart?: (user: CreatedUser) => void;
  onEditChange?: (value: string) => void;
  onEditSave?: (userId: string) => void;
  onEditCancel?: () => void;
  onDelete?: (userId: string) => void;
}

/**
 * Read-only / inline-edit table of users (presentational).
 */
export function UserListTable({
  users,
  busyUserId,
  editingUserId,
  editUsername = "",
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
}: UserListTableProps): ReactElement {
  const showActions =
    Boolean(onEditStart) ||
    Boolean(onDelete) ||
    Boolean(editingUserId);

  return (
    <table className="user-list-table" data-testid="user-list-table">
      <thead>
        <tr>
          <th>Username</th>
          <th>Email</th>
          <th>Roles</th>
          {showActions ? <th>Actions</th> : null}
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} data-testid={`user-list-row-${u.id}`}>
            <td>
              {editingUserId === u.id ? (
                <input
                  aria-label="Edit username"
                  value={editUsername}
                  disabled={busyUserId === u.id}
                  onChange={(ev) => {
                    onEditChange?.(ev.target.value);
                  }}
                />
              ) : (
                u.username
              )}
            </td>
            <td>{u.email}</td>
            <td>{(u.roles ?? []).join(", ") || "—"}</td>
            {showActions ? (
              <td>
                {editingUserId === u.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busyUserId === u.id}
                      onClick={() => {
                        onEditSave?.(u.id);
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={busyUserId === u.id}
                      onClick={() => {
                        onEditCancel?.();
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {onEditStart ? (
                      <button
                        type="button"
                        disabled={busyUserId === u.id}
                        onClick={() => {
                          onEditStart(u);
                        }}
                      >
                        Edit
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        disabled={busyUserId === u.id}
                        onClick={() => {
                          onDelete(u.id);
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </>
                )}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
