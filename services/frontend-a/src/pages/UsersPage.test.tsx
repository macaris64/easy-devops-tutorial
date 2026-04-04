import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import {
  authTestCleanup,
  isUsersListGet,
  primeSession,
  stubFetchWithMe,
  testAdminUser,
} from "../test/authTestUtils";
import { UsersPage } from "./UsersPage";

describe("UsersPage", () => {
  afterEach(() => {
    authTestCleanup();
  });

  it("submits create through gateway for admin", async () => {
    const user = userEvent.setup();
    primeSession();
    stubFetchWithMe(testAdminUser, (url, init) => {
      if (isUsersListGet(url, init)) {
        return {
          ok: true,
          json: () => Promise.resolve([]),
        } as Response;
      }
      if (url.includes("/users") && init?.method === "POST") {
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              id: "nid",
              username: "sam",
              email: "sam@example.com",
            }),
        } as Response;
      }
      return undefined;
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<UsersPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("user-management-panel")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Look up user" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/username/i), "sam");
    await user.type(screen.getByLabelText(/email/i), "sam@example.com");
    await user.click(screen.getByRole("button", { name: /create user/i }));
    await waitFor(() => {
      expect(screen.getByText("nid")).toBeInTheDocument();
    });
  });

  it("hides management panel for non-admin", async () => {
    primeSession();
    stubFetchWithMe({
      id: "2",
      username: "bob",
      email: "bob@example.com",
      roles: ["user"],
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<UsersPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("users-admin-only")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("user-management-panel")).toBeNull();
  });
});
