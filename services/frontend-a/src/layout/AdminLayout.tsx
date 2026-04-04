import type { ReactElement, ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export interface AdminLayoutProps {
  children?: ReactNode;
}

/**
 * Shell navigation for the admin SPA (users, logs, Kafka UI link).
 */
export function AdminLayout({ children }: AdminLayoutProps): ReactElement {
  const { user, logout, isAdmin } = useAuth();

  const tabClass = ({ isActive }: { isActive: boolean }): string =>
    isActive ? "admin-tab admin-tab-active" : "admin-tab";

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div className="admin-header-top">
          <div className="admin-header-brand">
            <strong className="admin-brand">Admin</strong>
            <span className="admin-brand-sub">Operations</span>
          </div>
          <nav
            className="admin-header-account"
            aria-label="Account"
            data-testid="admin-profile"
          >
            {user ? (
              <span className="admin-profile-user" data-testid="admin-profile-user">
                {user.username}
                <span className="admin-profile-email"> ({user.email})</span>
              </span>
            ) : null}
            <NavLink to="/me" className={tabClass}>
              Profile
            </NavLink>
            <button
              type="button"
              className="admin-tab admin-tab-ghost"
              onClick={() => {
                void logout();
              }}
            >
              Log out
            </button>
          </nav>
        </div>
        <nav className="admin-nav-tabs" aria-label="Main">
          <NavLink to="/" end className={tabClass}>
            Home
          </NavLink>
          {isAdmin ? (
            <NavLink to="/users" className={tabClass}>
              Users
            </NavLink>
          ) : null}
          {isAdmin ? (
            <NavLink to="/roles" className={tabClass}>
              Roles
            </NavLink>
          ) : null}
          <NavLink to="/logs" className={tabClass}>
            Logs
          </NavLink>
          <NavLink to="/kafka" className={tabClass}>
            Kafka
          </NavLink>
        </nav>
      </header>
      <main className="admin-main">{children ?? <Outlet />}</main>
    </div>
  );
}
