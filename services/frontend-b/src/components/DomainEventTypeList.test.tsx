import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DomainEventTypeList } from "./DomainEventTypeList";

describe("DomainEventTypeList", () => {
  it("renders catalog entries", () => {
    render(<DomainEventTypeList />);
    expect(screen.getByTestId("domain-event-type-list")).toBeInTheDocument();
    expect(screen.getByTestId("domain-event-card-user-created")).toBeInTheDocument();
    expect(screen.getByTestId("domain-event-card-user-login")).toBeInTheDocument();
  });

  it("accepts custom events", () => {
    render(
      <DomainEventTypeList
        events={[
          {
            event: "custom.event",
            description: "x",
            example: { event: "custom.event", timestamp: "t" },
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "custom.event" })).toBeInTheDocument();
  });
});
