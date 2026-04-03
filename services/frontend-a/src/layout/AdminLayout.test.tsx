import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { LoginPage } from "../pages/LoginPage";
import {
  authTestCleanup,
  primeSession,
  stubFetchWithMe,
} from "../test/authTestUtils";
import { AdminLayout } from "./AdminLayout";

const adminUser = {
  id: "1",
  username: "admin",
  email: "admin@example.com",
  roles: ["admin"],
};

describe("AdminLayout", () => {
  afterEach(() => {
    authTestCleanup();
  });

  it("marks active nav link and shows Users for admin", async () => {
    primeSession();
    stubFetchWithMe(adminUser, (url, init) => {
      if (url.includes("/auth/logout") && init?.method === "POST") {
        return { ok: true, json: () => Promise.resolve({}) } as Response;
      }
      return undefined;
    });
    render(
      <MemoryRouter initialEntries={["/users"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AdminLayout />}>
              <Route path="users" element={<div>users page</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("users page")).toBeInTheDocument();
    });
    const usersLink = screen.getByRole("link", { name: "Users" });
    expect(usersLink).toHaveClass("active");
    expect(screen.getByTestId("admin-profile")).toHaveTextContent("admin");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    });
  });

  it("hides Users nav link for non-admin", async () => {
    primeSession();
    stubFetchWithMe({
      id: "2",
      username: "bob",
      email: "bob@example.com",
      roles: ["user"],
    });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<div>home</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("home")).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: "Users" })).toBeNull();
  });
});
