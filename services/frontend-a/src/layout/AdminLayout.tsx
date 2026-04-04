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

  return (
    <div className="admin-root">
      <header className="admin-header">
        <strong className="admin-brand">Admin</strong>
        <nav className="admin-nav" aria-label="Main">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "admin-nav-link active" : "admin-nav-link"
            }
          >
            Home
          </NavLink>
          {isAdmin ? (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                isActive ? "admin-nav-link active" : "admin-nav-link"
              }
            >
              Users
            </NavLink>
          ) : null}
          <NavLink
            to="/logs"
            className={({ isActive }) =>
              isActive ? "admin-nav-link active" : "admin-nav-link"
            }
          >
            Logs
          </NavLink>
          <NavLink
            to="/kafka"
            className={({ isActive }) =>
              isActive ? "admin-nav-link active" : "admin-nav-link"
            }
          >
            Kafka
          </NavLink>
        </nav>
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
          <NavLink
            to="/me"
            className={({ isActive }) =>
              isActive ? "admin-nav-link active" : "admin-nav-link"
            }
          >
            Profile
          </NavLink>
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
      <main className="admin-main">{children ?? <Outlet />}</main>
    </div>
  );
}
