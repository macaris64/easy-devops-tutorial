import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoleBadgeList } from "./RoleBadgeList";

describe("RoleBadgeList", () => {
  it("renders empty state", () => {
    render(<RoleBadgeList roles={[]} />);
    expect(screen.getByTestId("role-badge-list-empty")).toBeInTheDocument();
  });

  it("renders badges", () => {
    render(<RoleBadgeList roles={["admin", "user"]} />);
    expect(screen.getByTestId("role-badge-admin")).toHaveTextContent("admin");
  });
});
