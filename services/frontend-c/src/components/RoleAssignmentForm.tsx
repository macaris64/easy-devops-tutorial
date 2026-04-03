import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import type { RoleOption } from "../types";

export interface RoleAssignmentFormProps {
  roles: RoleOption[];
  submitLabel?: string;
  disabled?: boolean;
  errorMessage?: string | null;
  onAssign: (roleId: string) => void | Promise<void>;
}

/**
 * Pick a role and assign it (callback only; parent owns user id).
 */
export function RoleAssignmentForm({
  roles,
  submitLabel = "Assign role",
  disabled = false,
  errorMessage,
  onAssign,
}: RoleAssignmentFormProps): ReactElement {
  const [roleId, setRoleId] = useState("");

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!roleId) {
      return;
    }
    await onAssign(roleId);
  }

  return (
    <form
      className="role-assignment-form"
      data-testid="role-assignment-form"
      onSubmit={(ev) => {
        void handleSubmit(ev);
      }}
    >
      <label htmlFor="role-assignment-select">Role</label>
      <select
        id="role-assignment-select"
        value={roleId}
        disabled={disabled}
        onChange={(ev) => {
          setRoleId(ev.target.value);
        }}
      >
        <option value="">Select…</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      {errorMessage ? (
        <p className="form-error" role="alert" data-testid="role-assignment-error">
          {errorMessage}
        </p>
      ) : null}
      <button type="submit" disabled={disabled || !roleId}>
        {submitLabel}
      </button>
    </form>
  );
}
