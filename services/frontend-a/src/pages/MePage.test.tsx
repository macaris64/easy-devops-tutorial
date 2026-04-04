import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import {
  authTestCleanup,
  primeSession,
  stubFetchWithMe,
  testAdminUser,
} from "../test/authTestUtils";
import { MePage } from "./MePage";

describe("MePage", () => {
  afterEach(() => {
    authTestCleanup();
  });

  it("shows profile and refreshes via /auth/me", async () => {
    const user = userEvent.setup();
    primeSession();
    let meCalls = 0;
    stubFetchWithMe(testAdminUser, (url) => {
      if (url.includes("/auth/me")) {
        meCalls += 1;
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              user: {
                ...testAdminUser,
                username: meCalls === 1 ? "admin" : "admin-refreshed",
              },
            }),
        } as Response;
      }
      return undefined;
    });
    render(
      <MemoryRouter initialEntries={["/me"]}>
        <AuthProvider>
          <Routes>
            <Route path="/me" element={<MePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("me-page")).toBeInTheDocument();
    });
    expect(screen.getByTestId("user-summary")).toHaveTextContent("admin");
    await user.click(screen.getByTestId("current-user-refresh"));
    await waitFor(() => {
      expect(screen.getByTestId("user-summary")).toHaveTextContent("admin-refreshed");
    });
    expect(meCalls).toBeGreaterThanOrEqual(2);
  });
});
