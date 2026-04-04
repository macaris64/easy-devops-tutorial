import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserListTable } from "./UserListTable";

describe("UserListTable", () => {
  it("renders users", () => {
    render(
      <UserListTable
        users={[
          { id: "1", username: "a", email: "a@a.com", roles: ["user"] },
        ]}
      />,
    );
    expect(screen.getByTestId("user-list-row-1")).toHaveTextContent("a@a.com");
  });

  it("invokes delete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <UserListTable
        users={[{ id: "1", username: "a", email: "a@a.com" }]}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("invokes save in edit mode", async () => {
    const user = userEvent.setup();
    const onEditSave = vi.fn();
    render(
      <UserListTable
        users={[{ id: "1", username: "a", email: "a@a.com" }]}
        editingUserId="1"
        editUsername="b"
        onEditSave={onEditSave}
        onEditCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onEditSave).toHaveBeenCalledWith("1");
  });

  it("invokes cancel in edit mode", async () => {
    const user = userEvent.setup();
    const onEditCancel = vi.fn();
    render(
      <UserListTable
        users={[{ id: "1", username: "a", email: "a@a.com" }]}
        editingUserId="1"
        editUsername="b"
        onEditSave={vi.fn()}
        onEditCancel={onEditCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onEditCancel).toHaveBeenCalled();
  });

  it("assigns role when Assign is clicked", async () => {
    const user = userEvent.setup();
    const onAssignRole = vi.fn().mockResolvedValue(undefined);
    const onRemoveRole = vi.fn().mockResolvedValue(undefined);
    render(
      <UserListTable
        users={[{ id: "u1", username: "a", email: "a@a.com", roles: [] }]}
        roleOptions={[
          { id: "r1", name: "editor" },
          { id: "r2", name: "admin" },
        ]}
        onAssignRole={onAssignRole}
        onRemoveRole={onRemoveRole}
      />,
    );
    await user.selectOptions(
      screen.getByLabelText(/assign role to a/i),
      "r1",
    );
    await user.click(screen.getByTestId("assign-role-u1"));
    await waitFor(() => {
      expect(onAssignRole).toHaveBeenCalledWith("u1", "r1");
    });
  });

  it("removes role when Remove is clicked", async () => {
    const user = userEvent.setup();
    const onAssignRole = vi.fn().mockResolvedValue(undefined);
    const onRemoveRole = vi.fn().mockResolvedValue(undefined);
    render(
      <UserListTable
        users={[{ id: "u1", username: "a", email: "a@a.com", roles: ["editor"] }]}
        roleOptions={[{ id: "r1", name: "editor" }]}
        onAssignRole={onAssignRole}
        onRemoveRole={onRemoveRole}
      />,
    );
    await user.click(screen.getByTestId("remove-role-u1-r1"));
    await waitFor(() => {
      expect(onRemoveRole).toHaveBeenCalledWith("u1", "r1");
    });
  });
});
