import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserLookupSection } from "./UserLookupSection";

describe("UserLookupSection", () => {
  it("loads user via fetchUser", async () => {
    const user = userEvent.setup();
    const fetchUser = vi.fn().mockResolvedValue({
      id: "id-1",
      username: "bob",
      email: "bob@example.com",
    });
    render(<UserLookupSection fetchUser={fetchUser} />);
    await user.type(screen.getByLabelText(/user id/i), "id-1");
    await user.click(screen.getByRole("button", { name: /^load$/i }));
    await waitFor(() => {
      expect(screen.getByText("bob")).toBeInTheDocument();
    });
    expect(fetchUser).toHaveBeenCalledWith("id-1");
  });

  it("shows error when id empty", async () => {
    const user = userEvent.setup();
    render(
      <UserLookupSection fetchUser={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /^load$/i }));
    expect(screen.getByTestId("user-lookup-error")).toHaveTextContent(
      /enter a user id/i,
    );
  });
});
