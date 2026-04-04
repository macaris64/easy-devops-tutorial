import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogPanel } from "./LogPanel";

describe("LogPanel", () => {
  it("renders title and empty state by default", () => {
    render(<LogPanel entries={[]} />);
    expect(screen.getByRole("heading", { name: "Logs" })).toBeInTheDocument();
    expect(screen.getByTestId("log-table-empty")).toBeInTheDocument();
  });

  it("filters entries by search text", () => {
    render(
      <LogPanel
        entries={[
          { id: "1", path: "/alpha", method: "GET", createdAt: "t" },
          { id: "2", path: "/beta", method: "POST", createdAt: "t" },
        ]}
      />,
    );
    fireEvent.change(screen.getByTestId("log-panel-filter"), {
      target: { value: "beta" },
    });
    expect(screen.queryByTestId("log-row-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("log-row-2")).toBeInTheDocument();
  });

  it("shows no-match message when filter excludes all", () => {
    render(
      <LogPanel
        entries={[{ id: "1", path: "/a", method: "GET", createdAt: "t" }]}
        emptyMessage="No data."
      />,
    );
    fireEvent.change(screen.getByTestId("log-panel-filter"), {
      target: { value: "zzz" },
    });
    expect(screen.getByTestId("log-table-empty")).toHaveTextContent(
      "No entries match your search.",
    );
  });

  it("renders custom title and toolbar", () => {
    render(
      <LogPanel
        title="Audit"
        entries={[]}
        toolbar={<span data-testid="tb">Reload</span>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Audit" })).toBeInTheDocument();
    expect(screen.getByTestId("tb")).toBeInTheDocument();
  });
});
