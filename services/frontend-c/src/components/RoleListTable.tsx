import type { ReactElement } from "react";
import type { RoleRecord } from "../types";

export interface RoleListTableProps {
  roles: RoleRecord[];
  busyRoleId?: string | null;
  editingRoleId?: string | null;
  editName?: string;
  onEditStart?: (role: RoleRecord) => void;
  onEditChange?: (value: string) => void;
  onEditSave?: (roleId: string) => void;
  onEditCancel?: () => void;
  onDelete?: (roleId: string) => void;
}

export function RoleListTable({
  roles,
  busyRoleId,
  editingRoleId,
  editName = "",
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
}: RoleListTableProps): ReactElement {
  const showActions =
    Boolean(onEditStart) || Boolean(onDelete) || Boolean(editingRoleId);

  return (
    <table className="user-list-table" data-testid="role-list-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          {showActions ? <th>Actions</th> : null}
        </tr>
      </thead>
      <tbody>
        {roles.map((r) => (
          <tr key={r.id} data-testid={`role-list-row-${r.id}`}>
            <td>
              <code>{r.id}</code>
            </td>
            <td>
              {editingRoleId === r.id ? (
                <input
                  aria-label="Edit role name"
                  value={editName}
                  disabled={busyRoleId === r.id}
                  onChange={(ev) => {
                    onEditChange?.(ev.target.value);
                  }}
                />
              ) : (
                r.name
              )}
            </td>
            {showActions ? (
              <td>
                {editingRoleId === r.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busyRoleId === r.id}
                      onClick={() => {
                        onEditSave?.(r.id);
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={busyRoleId === r.id}
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
                        disabled={busyRoleId === r.id}
                        onClick={() => {
                          onEditStart(r);
                        }}
                      >
                        Edit
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        disabled={busyRoleId === r.id}
                        onClick={() => {
                          onDelete(r.id);
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
