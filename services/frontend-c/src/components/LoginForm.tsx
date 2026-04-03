import type { FormEvent, ReactElement } from "react";
import { useState } from "react";

export interface LoginFormProps {
  onSubmit: (payload: { username: string; password: string }) => void | Promise<void>;
  disabled?: boolean;
  errorMessage?: string | null;
}

/**
 * Presentational username/password login form.
 */
export function LoginForm({
  onSubmit,
  disabled = false,
  errorMessage,
}: LoginFormProps): ReactElement {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    await onSubmit({ username: username.trim(), password });
  }

  return (
    <form
      className="login-form"
      data-testid="login-form"
      onSubmit={(ev) => {
        void handleSubmit(ev);
      }}
    >
      <div className="field">
        <label htmlFor="login-form-username">Username</label>
        <input
          id="login-form-username"
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
        <label htmlFor="login-form-password">Password</label>
        <input
          id="login-form-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          disabled={disabled}
          onChange={(ev) => {
            setPassword(ev.target.value);
          }}
        />
      </div>
      {errorMessage ? (
        <p className="form-error" role="alert" data-testid="login-form-error">
          {errorMessage}
        </p>
      ) : null}
      <button type="submit" disabled={disabled}>
        Log in
      </button>
    </form>
  );
}
