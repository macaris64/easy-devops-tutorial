import type { FormEvent, ReactElement } from "react";
import { useState } from "react";

export interface RoleCreateFormProps {
  onSubmit: (payload: { name: string }) => void | Promise<void>;
  disabled?: boolean;
  errorMessage?: string | null;
}

export function RoleCreateForm({
  onSubmit,
  disabled = false,
  errorMessage,
}: RoleCreateFormProps): ReactElement {
  const [name, setName] = useState("");

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    await onSubmit({ name: name.trim() });
  }

  return (
    <form
      data-testid="role-create-form"
      className="user-create-form"
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
    >
      <div className="field">
        <label htmlFor="role-create-name">Role name</label>
        <input
          id="role-create-name"
          name="name"
          autoComplete="off"
          value={name}
          disabled={disabled}
          onChange={(ev) => {
            setName(ev.target.value);
          }}
        />
      </div>
      {errorMessage ? (
        <p className="form-error" role="alert" data-testid="role-form-error">
          {errorMessage}
        </p>
      ) : null}
      <button type="submit" disabled={disabled}>
        Create role
      </button>
    </form>
  );
}
