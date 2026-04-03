import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import {
  authTestCleanup,
  isUsersListGet,
  primeSession,
  stubFetchWithMe,
} from "./test/authTestUtils";

const adminUser = {
  id: "1",
  username: "admin",
  email: "admin@example.com",
  roles: ["admin"],
};

describe("App", () => {
  afterEach(() => {
    authTestCleanup();
  });

  it("redirects unauthenticated users to login", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    });
  });

  it("renders home when session is valid", async () => {
    primeSession();
    stubFetchWithMe(adminUser);
    render(
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Admin dashboard" }),
      ).toBeInTheDocument();
    });
  });

  it("renders users route for admin", async () => {
    primeSession();
    stubFetchWithMe(adminUser, (url, init) => {
      if (isUsersListGet(url, init)) {
        return {
          ok: true,
          json: () => Promise.resolve([]),
        } as Response;
      }
      return undefined;
    });
    render(
      <MemoryRouter initialEntries={["/users"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    });
  });

  it("renders kafka route", async () => {
    primeSession();
    stubFetchWithMe(adminUser);
    render(
      <MemoryRouter initialEntries={["/kafka"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Kafka" })).toBeInTheDocument();
    });
  });
});
