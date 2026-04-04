import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DomainEventSampleCard } from "./DomainEventSampleCard";

describe("DomainEventSampleCard", () => {
  it("renders title and JSON", () => {
    render(
      <DomainEventSampleCard
        title="user.created"
        description="Test"
        example={{ event: "user", data: "user.created", user_id: "1" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "user.created" })).toBeInTheDocument();
    expect(screen.getByText(/"user_id"/)).toBeInTheDocument();
  });
});
