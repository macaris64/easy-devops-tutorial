import type { FormEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage(): ReactElement {
  const { login, accessToken, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | undefined)?.from ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && accessToken) {
      navigate(from, { replace: true });
    }
  }, [accessToken, from, loading, navigate]);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="login-page" data-testid="login-loading">
        Loading…
      </div>
    );
  }

  return (
    <div className="login-page">
      <h1>Sign in</h1>
      <form
        className="login-form"
        onSubmit={(ev) => {
          void onSubmit(ev);
        }}
      >
        <div className="field">
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            name="username"
            autoComplete="username"
            value={username}
            disabled={busy}
            onChange={(ev) => {
              setUsername(ev.target.value);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            disabled={busy}
            onChange={(ev) => {
              setPassword(ev.target.value);
            }}
          />
        </div>
        {error ? (
          <p className="form-error" role="alert" data-testid="login-error">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy}>
          Log in
        </button>
      </form>
    </div>
  );
}
