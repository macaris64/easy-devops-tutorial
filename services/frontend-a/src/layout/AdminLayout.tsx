import type { ReactElement, ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";

export interface AdminLayoutProps {
  children?: ReactNode;
}

/**
 * Shell navigation for the admin SPA (users + logs).
 */
export function AdminLayout({ children }: AdminLayoutProps): ReactElement {
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
          <NavLink
            to="/users"
            className={({ isActive }) =>
              isActive ? "admin-nav-link active" : "admin-nav-link"
            }
          >
            Users
          </NavLink>
          <NavLink
            to="/logs"
            className={({ isActive }) =>
              isActive ? "admin-nav-link active" : "admin-nav-link"
            }
          >
            Logs
          </NavLink>
        </nav>
      </header>
      <main className="admin-main">{children ?? <Outlet />}</main>
    </div>
  );
}
