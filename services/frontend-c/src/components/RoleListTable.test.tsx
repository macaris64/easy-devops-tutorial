import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoleListTable } from "./RoleListTable";

describe("RoleListTable", () => {
  it("renders rows", () => {
    render(
      <RoleListTable
        roles={[
          { id: "a", name: "Alpha" },
          { id: "b", name: "Beta" },
        ]}
      />,
    );
    expect(screen.getByTestId("role-list-row-a")).toHaveTextContent("Alpha");
    expect(screen.getByTestId("role-list-row-b")).toHaveTextContent("Beta");
  });

  it("invokes delete", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <RoleListTable roles={[{ id: "x", name: "r" }]} onDelete={onDelete} />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("x");
  });
});
