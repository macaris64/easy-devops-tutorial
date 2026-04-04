import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import {
  authTestCleanup,
  isRolesListGet,
  primeSession,
  stubFetchWithMe,
  testAdminUser,
} from "../test/authTestUtils";
import { RolesPage } from "./RolesPage";

describe("RolesPage", () => {
  afterEach(() => {
    authTestCleanup();
  });

  it("shows role management for admin", async () => {
    primeSession();
    stubFetchWithMe(testAdminUser, (url, init) => {
      if (isRolesListGet(url, init)) {
        return {
          ok: true,
          json: () => Promise.resolve([{ id: "r1", name: "admin" }]),
        } as Response;
      }
      return undefined;
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RolesPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("role-management-panel")).toBeInTheDocument();
    });
  });

  it("hides management for non-admin", async () => {
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
            <Route path="/" element={<RolesPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("roles-admin-only")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("role-management-panel")).toBeNull();
  });
});
