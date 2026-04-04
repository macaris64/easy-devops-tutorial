import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CurrentUserCard } from "./CurrentUserCard";

describe("CurrentUserCard", () => {
  it("renders empty state without refresh", () => {
    render(<CurrentUserCard user={null} emptyLabel="Nothing." />);
    expect(screen.getByTestId("user-summary-empty")).toHaveTextContent("Nothing.");
    expect(screen.queryByTestId("current-user-refresh")).toBeNull();
  });

  it("renders user and calls onRefresh", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <CurrentUserCard
        user={{
          id: "id-1",
          username: "alice",
          email: "a@b.c",
          roles: ["admin"],
        }}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.getByTestId("user-summary")).toBeInTheDocument();
    await user.click(screen.getByTestId("current-user-refresh"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("disables refresh while refreshing", () => {
    render(
      <CurrentUserCard
        user={{
          id: "1",
          username: "u",
          email: "u@u.com",
        }}
        onRefresh={vi.fn()}
        refreshing
      />,
    );
    expect(screen.getByTestId("current-user-refresh")).toBeDisabled();
    expect(screen.getByTestId("current-user-refresh")).toHaveTextContent("Refreshing…");
  });
});
