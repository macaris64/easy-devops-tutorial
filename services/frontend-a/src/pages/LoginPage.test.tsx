import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { authTestCleanup, stubFetchWithMe } from "../test/authTestUtils";
import { HomePage } from "./HomePage";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  afterEach(() => {
    authTestCleanup();
  });

  it("logs in and navigates home", async () => {
    const user = userEvent.setup();
    stubFetchWithMe(
      {
        id: "1",
        username: "u",
        email: "u@u.com",
        roles: ["admin"],
      },
      (url, init) => {
        if (url.includes("/auth/login") && init?.method === "POST") {
          return {
            ok: true,
            json: () =>
              Promise.resolve({
                accessToken: "a",
                refreshToken: "r",
                user: {
                  id: "1",
                  username: "u",
                  email: "u@u.com",
                  roles: ["admin"],
                },
              }),
          } as Response;
        }
        return undefined;
      },
    );
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(/username/i), "u");
    await user.type(screen.getByLabelText(/password/i), "p");
    await user.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Admin dashboard" }),
      ).toBeInTheDocument();
    });
  });

  it("shows error on failed login", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ error: "bad" }),
      }),
    );
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(/username/i), "u");
    await user.type(screen.getByLabelText(/password/i), "p");
    await user.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toHaveTextContent("bad");
    });
  });
});
