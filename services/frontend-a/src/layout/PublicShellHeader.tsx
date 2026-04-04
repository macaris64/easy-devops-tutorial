import type { ReactElement } from "react";
import { NavLink } from "react-router-dom";

/**
 * Top bar for unauthenticated routes (e.g. sign-in) — matches admin header styling.
 */
export function PublicShellHeader(): ReactElement {
  return (
    <header className="admin-header" role="banner">
      <span className="admin-brand">Admin</span>
      <nav className="admin-nav" aria-label="Account">
        <NavLink
          to="/login"
          className={({ isActive }) =>
            isActive ? "admin-nav-link active" : "admin-nav-link"
          }
        >
          Sign in
        </NavLink>
      </nav>
    </header>
  );
}
