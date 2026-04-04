import { LoginForm } from "@easy-devops/user-panel";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage(): ReactElement {
  const { login, accessToken, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | undefined)?.from ?? "/";

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && accessToken) {
      navigate(from, { replace: true });
    }
  }, [accessToken, from, loading, navigate]);

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
      <LoginForm
        disabled={busy}
        errorMessage={error}
        onSubmit={async ({ username, password }) => {
          setError(null);
          setBusy(true);
          try {
            await login(username, password);
            navigate(from, { replace: true });
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Login failed");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
