import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UsersPage } from "./UsersPage";

describe("UsersPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("submits through gateway", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "nid",
            username: "sam",
            email: "sam@example.com",
          }),
      }),
    );
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<UsersPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(/username/i), "sam");
    await user.type(screen.getByLabelText(/email/i), "sam@example.com");
    await user.click(screen.getByRole("button", { name: /create user/i }));
    await waitFor(() => {
      expect(screen.getByText("nid")).toBeInTheDocument();
    });
  });
});
