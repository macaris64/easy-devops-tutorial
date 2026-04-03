import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogPanel } from "./LogPanel";

describe("LogPanel", () => {
  it("renders title and empty state by default", () => {
    render(<LogPanel entries={[]} />);
    expect(screen.getByRole("heading", { name: "Logs" })).toBeInTheDocument();
    expect(screen.getByTestId("log-table-empty")).toBeInTheDocument();
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
