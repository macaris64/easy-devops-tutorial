import type { FormEvent, ReactElement } from "react";
import { useState } from "react";

export interface UserCreateFormProps {
  onSubmit: (payload: {
    username: string;
    email: string;
  }) => void | Promise<void>;
  disabled?: boolean;
  errorMessage?: string | null;
}

/**
 * Minimal create-user form (username and email).
 */
export function UserCreateForm({
  onSubmit,
  disabled = false,
  errorMessage,
}: UserCreateFormProps): ReactElement {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    await onSubmit({ username: username.trim(), email: email.trim() });
  }

  return (
    <form
      data-testid="user-create-form"
      className="user-create-form"
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
    >
      <div className="field">
        <label htmlFor="user-create-username">Username</label>
        <input
          id="user-create-username"
          name="username"
          autoComplete="username"
          value={username}
          disabled={disabled}
          onChange={(ev) => {
            setUsername(ev.target.value);
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="user-create-email">Email</label>
        <input
          id="user-create-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={disabled}
          onChange={(ev) => {
            setEmail(ev.target.value);
          }}
        />
      </div>
      {errorMessage ? (
        <p className="form-error" role="alert" data-testid="form-error">
          {errorMessage}
        </p>
      ) : null}
      <button type="submit" disabled={disabled}>
        Create user
      </button>
    </form>
  );
}
