import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogsPage } from "./LogsPage";

describe("LogsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads and displays audit rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "1",
              path: "/users",
              method: "POST",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ]),
      }),
    );
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<LogsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("log-row-1")).toBeInTheDocument();
    });
  });

  it("shows error when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "x",
        json: () => Promise.resolve({ error: "denied" }),
      }),
    );
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<LogsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("logs-error")).toHaveTextContent("denied");
    });
  });

  it("refresh triggers another fetch", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "2",
              path: "/x",
              method: "GET",
              createdAt: "t",
            },
          ]),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<LogsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    await user.click(screen.getByRole("button", { name: /refresh/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
