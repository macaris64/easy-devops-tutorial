import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const { accessToken, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="auth-loading" data-testid="auth-loading">
        Loading…
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return children;
}
