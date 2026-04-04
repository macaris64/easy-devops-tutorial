import { LoginForm } from "@easy-devops/user-panel";
import type { ReactElement } from "react";
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PublicShellHeader } from "../layout/PublicShellHeader";

export function LoginPage(): ReactElement {
  const { login, logout, user, accessToken, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | undefined)?.from ?? "/";

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="login-shell">
        <PublicShellHeader />
        <div className="login-page" data-testid="login-loading">
          Loading…
        </div>
      </div>
    );
  }

  if (accessToken && user) {
    return (
      <div className="login-shell">
        <header className="admin-header" role="banner">
          <span className="admin-brand">Admin</span>
          <nav className="admin-nav" aria-label="Main">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "admin-nav-link active" : "admin-nav-link"
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/me"
              className={({ isActive }) =>
                isActive ? "admin-nav-link active" : "admin-nav-link"
              }
            >
              Profile
            </NavLink>
          </nav>
          <nav className="admin-header-account" aria-label="Account">
            <button
              type="button"
              className="admin-nav-link admin-nav-button"
              onClick={() => {
                void logout();
              }}
            >
              Log out
            </button>
          </nav>
        </header>
        <div className="login-page" data-testid="login-already-signed-in">
          <h1>Already signed in</h1>
          <p>
            You are signed in as <strong>{user.username}</strong> ({user.email}).
          </p>
          <p className="login-page-actions">
            <button
              type="button"
              className="login-continue"
              onClick={() => {
                navigate(from, { replace: true });
              }}
            >
              Continue to app
            </button>
            <button
              type="button"
              className="admin-logout"
              onClick={() => {
                void logout();
              }}
            >
              Sign out
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <PublicShellHeader />
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
    </div>
  );
}
