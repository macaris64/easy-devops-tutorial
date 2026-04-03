import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserManagementPanel } from "./UserManagementPanel";

describe("UserManagementPanel", () => {
  it("shows created user after successful createUser", async () => {
    const user = userEvent.setup();
    const createUser = vi.fn().mockResolvedValue({
      id: "new",
      username: "sam",
      email: "sam@example.com",
    });
    render(<UserManagementPanel createUser={createUser} />);
    await user.type(screen.getByLabelText(/username/i), "sam");
    await user.type(screen.getByLabelText(/email/i), "sam@example.com");
    await user.click(screen.getByRole("button", { name: /create user/i }));
    await waitFor(() => {
      expect(screen.getByText("new")).toBeInTheDocument();
    });
    expect(createUser).toHaveBeenCalledWith("sam", "sam@example.com");
  });

  it("surfaces errors from createUser", async () => {
    const user = userEvent.setup();
    const createUser = vi.fn().mockRejectedValue(new Error("Upstream failed"));
    render(<UserManagementPanel createUser={createUser} />);
    await user.type(screen.getByLabelText(/username/i), "a");
    await user.type(screen.getByLabelText(/email/i), "a@b.c");
    await user.click(screen.getByRole("button", { name: /create user/i }));
    await waitFor(() => {
      expect(screen.getByTestId("form-error")).toHaveTextContent(
        "Upstream failed",
      );
    });
  });

  it("uses generic message when rejection is not an Error", async () => {
    const user = userEvent.setup();
    const createUser = vi.fn().mockRejectedValue("weird");
    render(<UserManagementPanel createUser={createUser} />);
    await user.type(screen.getByLabelText(/username/i), "x");
    await user.type(screen.getByLabelText(/email/i), "x@y.z");
    await user.click(screen.getByRole("button", { name: /create user/i }));
    await waitFor(() => {
      expect(screen.getByTestId("form-error")).toHaveTextContent(
        "User creation failed",
      );
    });
  });
});
