import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogEntryRow } from "./LogEntryRow";

describe("LogEntryRow", () => {
  it("renders entry fields", () => {
    render(
      <table>
        <tbody>
          <LogEntryRow
            entry={{
              id: "x",
              path: "/api",
              method: "GET",
              createdAt: "2026-01-01T00:00:00.000Z",
            }}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText("/api")).toBeInTheDocument();
    expect(screen.getByText("GET")).toBeInTheDocument();
    expect(screen.getByText("2026-01-01T00:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByTestId("log-entry-user-id")).toHaveTextContent("—");
    expect(screen.getByTestId("log-entry-payload")).toHaveTextContent("—");
  });

  it("renders createdUserId when set", () => {
    render(
      <table>
        <tbody>
          <LogEntryRow
            entry={{
              id: "y",
              path: "/",
              method: "POST",
              createdAt: "t",
              createdUserId: "user-99",
            }}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByTestId("log-entry-user-id")).toHaveTextContent("user-99");
  });

  it("renders payload JSON", () => {
    render(
      <table>
        <tbody>
          <LogEntryRow
            entry={{
              id: "z",
              path: "/users",
              method: "POST",
              createdAt: "t",
              payload: { kind: "user", action: "create" },
            }}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByTestId("log-entry-payload")).toHaveTextContent(
      '"kind":"user"',
    );
  });
});
