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

  it("loads directory when listUsers is provided", async () => {
    const listUsers = vi.fn().mockResolvedValue([
      { id: "u1", username: "a", email: "a@a.com" },
    ]);
    render(
      <UserManagementPanel createUser={vi.fn().mockResolvedValue({ id: "n", username: "b", email: "b@b.com" })} listUsers={listUsers} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("user-list-row-u1")).toBeInTheDocument();
    });
  });

  it("updates a user when updateUser is provided", async () => {
    const user = userEvent.setup();
    const listUsers = vi.fn().mockResolvedValue([
      { id: "u1", username: "a", email: "a@a.com" },
    ]);
    const updateUser = vi.fn().mockResolvedValue({
      id: "u1",
      username: "b",
      email: "a@a.com",
    });
    render(
      <UserManagementPanel
        createUser={vi.fn().mockResolvedValue({ id: "n", username: "x", email: "x@x.com" })}
        listUsers={listUsers}
        updateUser={updateUser}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText(/edit username/i));
    await user.type(screen.getByLabelText(/edit username/i), "b");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith("u1", { username: "b" });
    });
  });

  it("deletes a user when deleteUser is provided", async () => {
    const user = userEvent.setup();
    const listUsers = vi
      .fn()
      .mockResolvedValueOnce([{ id: "u1", username: "a", email: "a@a.com" }])
      .mockResolvedValueOnce([]);
    const deleteUser = vi.fn().mockResolvedValue(undefined);
    render(
      <UserManagementPanel
        createUser={vi.fn().mockResolvedValue({ id: "n", username: "x", email: "x@x.com" })}
        listUsers={listUsers}
        deleteUser={deleteUser}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith("u1");
    });
  });
});
