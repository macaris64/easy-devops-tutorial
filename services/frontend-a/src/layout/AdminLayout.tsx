import { ProfileSummary } from "@easy-devops/user-panel";
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
          <NavLink
            to="/me"
            className={({ isActive }) =>
              isActive ? "admin-nav-link active" : "admin-nav-link"
            }
          >
            My account
          </NavLink>
        </nav>
        <div className="admin-profile" data-testid="admin-profile">
          <ProfileSummary
            user={
              user
                ? {
                    username: user.username,
                    email: user.email,
                    roles: user.roles,
                  }
                : null
            }
            onLogout={() => {
              void logout();
            }}
            emptyLabel=""
          />
        </div>
      </header>
      <main className="admin-main">{children ?? <Outlet />}</main>
    </div>
  );
}
