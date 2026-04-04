import type { ReactElement } from "react";
import { useState } from "react";
import type { CreatedUser, RoleOption } from "../types";

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
  /** When set with callbacks, shows assign/remove controls (role ids from API). */
  roleOptions?: RoleOption[];
  busyRoleUserId?: string | null;
  onAssignRole?: (userId: string, roleId: string) => Promise<void>;
  onRemoveRole?: (userId: string, roleId: string) => Promise<void>;
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
  roleOptions,
  busyRoleUserId,
  onAssignRole,
  onRemoveRole,
}: UserListTableProps): ReactElement {
  const [assignPick, setAssignPick] = useState<Record<string, string>>({});
  const showRoleControls =
    Boolean(roleOptions?.length) &&
    Boolean(onAssignRole) &&
    Boolean(onRemoveRole);
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
            <td>
              {showRoleControls && roleOptions ? (
                <div className="user-list-roles-cell" data-testid={`user-roles-cell-${u.id}`}>
                  <ul className="user-list-role-tags">
                    {(u.roles ?? []).map((name) => {
                      const r = roleOptions.find((x) => x.name === name);
                      return (
                        <li key={name}>
                          <span>{name}</span>
                          {r ? (
                            <button
                              type="button"
                              className="user-list-role-remove"
                              disabled={busyRoleUserId === u.id}
                              data-testid={`remove-role-${u.id}-${r.id}`}
                              onClick={() => {
                                if (onRemoveRole) {
                                  void onRemoveRole(u.id, r.id);
                                }
                              }}
                            >
                              Remove
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="user-list-role-assign">
                    <select
                      aria-label={`Assign role to ${u.username}`}
                      value={assignPick[u.id] ?? ""}
                      disabled={busyRoleUserId === u.id}
                      onChange={(ev) => {
                        setAssignPick((prev) => ({ ...prev, [u.id]: ev.target.value }));
                      }}
                    >
                      <option value="">Assign role…</option>
                      {roleOptions
                        .filter((r) => !(u.roles ?? []).includes(r.name))
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={
                        busyRoleUserId === u.id || !(assignPick[u.id] && assignPick[u.id].length > 0)
                      }
                      data-testid={`assign-role-${u.id}`}
                      onClick={() => {
                        const rid = assignPick[u.id];
                        if (!rid || !onAssignRole) {
                          return;
                        }
                        void onAssignRole(u.id, rid).then(() => {
                          setAssignPick((prev) => ({ ...prev, [u.id]: "" }));
                        });
                      }}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ) : (
                (u.roles ?? []).join(", ") || "—"
              )}
            </td>
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
