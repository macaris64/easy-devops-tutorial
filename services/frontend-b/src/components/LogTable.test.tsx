import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogTable } from "./LogTable";

describe("LogTable", () => {
  it("shows empty message when no entries", () => {
    render(<LogTable entries={[]} emptyMessage="Nothing here." />);
    expect(screen.getByTestId("log-table-empty")).toHaveTextContent(
      "Nothing here.",
    );
  });

  it("renders rows for each entry", () => {
    render(
      <LogTable
        entries={[
          {
            id: "1",
            path: "/a",
            method: "GET",
            createdAt: "t1",
          },
          {
            id: "2",
            path: "/b",
            method: "POST",
            createdAt: "t2",
          },
        ]}
      />,
    );
    expect(screen.getByTestId("log-table")).toBeInTheDocument();
    expect(screen.getByTestId("log-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("log-row-2")).toBeInTheDocument();
  });
});
