import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserSummary } from "./UserSummary";

describe("UserSummary", () => {
  it("renders empty state", () => {
    render(<UserSummary user={null} emptyLabel="None." />);
    expect(screen.getByTestId("user-summary-empty")).toHaveTextContent("None.");
  });

  it("renders user fields", () => {
    render(
      <UserSummary
        user={{
          id: "id-42",
          username: "pat",
          email: "pat@example.com",
        }}
      />,
    );
    const block = screen.getByTestId("user-summary");
    expect(block).toHaveTextContent("id-42");
    expect(block).toHaveTextContent("pat");
    expect(block).toHaveTextContent("pat@example.com");
  });

  it("renders roles when present", () => {
    render(
      <UserSummary
        user={{
          id: "1",
          username: "pat",
          email: "pat@example.com",
          roles: ["admin"],
        }}
      />,
    );
    expect(screen.getByTestId("user-summary")).toHaveTextContent("admin");
  });
});
