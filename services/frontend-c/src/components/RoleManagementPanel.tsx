import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import type { RoleListFilters, RoleRecord } from "../types";
import { RoleCreateForm } from "./RoleCreateForm";
import { RoleListTable } from "./RoleListTable";

export interface RoleManagementPanelProps {
  title?: string;
  listRoles: (filters?: RoleListFilters) => Promise<RoleRecord[]>;
  createRole: (name: string) => Promise<RoleRecord>;
  updateRole: (id: string, name: string) => Promise<RoleRecord>;
  deleteRole: (id: string) => Promise<RoleRecord>;
}

export function RoleManagementPanel({
  title = "Role management",
  listRoles,
  createRole,
  updateRole,
  deleteRole,
}: RoleManagementPanelProps): ReactElement {
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [rows, setRows] = useState<RoleRecord[]>([]);
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [listFilters, setListFilters] = useState<RoleListFilters>({});
  const [qInput, setQInput] = useState("");

  const reloadList = useCallback(async () => {
    setListError(null);
    try {
      const next = await listRoles(listFilters);
      setRows(next);
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : "Failed to load roles");
    }
  }, [listRoles, listFilters]);

  useEffect(() => {
    void reloadList();
  }, [reloadList]);

  const handleCreate = useCallback(
    async (payload: { name: string }) => {
      if (!payload.name) {
        return;
      }
      setCreateError(null);
      setBusy(true);
      try {
        await createRole(payload.name);
        await reloadList();
      } catch (e: unknown) {
        setCreateError(e instanceof Error ? e.message : "Role creation failed");
      } finally {
        setBusy(false);
      }
    },
    [createRole, reloadList],
  );

  const handleEditSave = useCallback(
    async (id: string) => {
      const name = editName.trim();
      if (!name) {
        return;
      }
      setBusyRoleId(id);
      setListError(null);
      try {
        await updateRole(id, name);
        setEditingRoleId(null);
        await reloadList();
      } catch (e: unknown) {
        setListError(e instanceof Error ? e.message : "Update failed");
      } finally {
        setBusyRoleId(null);
      }
    },
    [editName, reloadList, updateRole],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setBusyRoleId(id);
      setListError(null);
      try {
        await deleteRole(id);
        await reloadList();
      } catch (e: unknown) {
        setListError(e instanceof Error ? e.message : "Delete failed");
      } finally {
        setBusyRoleId(null);
      }
    },
    [deleteRole, reloadList],
  );

  return (
    <section className="user-management-panel" data-testid="role-management-panel">
      <h2>{title}</h2>
      <RoleCreateForm
        onSubmit={handleCreate}
        disabled={busy}
        errorMessage={createError}
      />
      <div className="user-management-list" data-testid="role-management-list">
        <h3>All roles</h3>
        <div className="user-panel-toolbar" data-testid="role-list-filters">
          <label>
            Search
            <input
              type="search"
              value={qInput}
              placeholder="Role name"
              data-testid="role-filter-q"
              onChange={(e) => {
                setQInput(e.target.value);
              }}
            />
          </label>
          <div className="user-panel-toolbar-actions">
            <button
              type="button"
              data-testid="role-filter-apply"
              onClick={() => {
                const f: RoleListFilters = {};
                if (qInput.trim() !== "") {
                  f.query = qInput.trim();
                }
                setListFilters(f);
              }}
            >
              Apply filters
            </button>
          </div>
        </div>
        {listError ? (
          <p className="form-error" role="alert" data-testid="role-list-error">
            {listError}
          </p>
        ) : null}
        <RoleListTable
          roles={rows}
          busyRoleId={busyRoleId}
          editingRoleId={editingRoleId}
          editName={editName}
          onEditStart={(r) => {
            setEditingRoleId(r.id);
            setEditName(r.name);
          }}
          onEditChange={setEditName}
          onEditSave={(id) => {
            void handleEditSave(id);
          }}
          onEditCancel={() => {
            setEditingRoleId(null);
          }}
          onDelete={(id) => {
            void handleDelete(id);
          }}
        />
      </div>
    </section>
  );
}
