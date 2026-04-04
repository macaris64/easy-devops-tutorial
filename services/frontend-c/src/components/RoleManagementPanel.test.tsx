import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoleManagementPanel } from "./RoleManagementPanel";

function defaultProps() {
  return {
    listRoles: vi.fn().mockResolvedValue([{ id: "r1", name: "admin" }]),
    createRole: vi.fn().mockResolvedValue({ id: "r2", name: "editor" }),
    updateRole: vi.fn().mockResolvedValue({ id: "r1", name: "superadmin" }),
    deleteRole: vi.fn().mockResolvedValue({ id: "r1", name: "admin" }),
  };
}

describe("RoleManagementPanel", () => {
  it("loads roles on mount", async () => {
    const props = defaultProps();
    render(<RoleManagementPanel {...props} />);
    await waitFor(() => {
      expect(screen.getByTestId("role-list-row-r1")).toBeInTheDocument();
    });
    expect(props.listRoles).toHaveBeenCalledWith({});
  });

  it("applies role name filter when Apply is clicked", async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<RoleManagementPanel {...props} />);
    await waitFor(() => expect(props.listRoles).toHaveBeenCalledWith({}));
    await user.type(screen.getByTestId("role-filter-q"), "adm");
    await user.click(screen.getByTestId("role-filter-apply"));
    await waitFor(() => {
      expect(props.listRoles).toHaveBeenLastCalledWith({ query: "adm" });
    });
  });

  it("creates a role", async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    props.listRoles.mockResolvedValueOnce([]).mockResolvedValue([{ id: "r2", name: "editor" }]);
    render(<RoleManagementPanel {...props} />);
    await waitFor(() => {
      expect(screen.getByTestId("role-list-table")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/role name/i), "editor");
    await user.click(screen.getByRole("button", { name: /create role/i }));
    await waitFor(() => {
      expect(props.createRole).toHaveBeenCalledWith("editor");
    });
  });

  it("surfaces create errors", async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    props.createRole.mockRejectedValue(new Error("duplicate"));
    render(<RoleManagementPanel {...props} />);
    await user.type(screen.getByLabelText(/role name/i), "x");
    await user.click(screen.getByRole("button", { name: /create role/i }));
    await waitFor(() => {
      expect(screen.getByTestId("role-form-error")).toHaveTextContent("duplicate");
    });
  });

  it("updates a role name", async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<RoleManagementPanel {...props} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText(/edit role name/i));
    await user.type(screen.getByLabelText(/edit role name/i), "superadmin");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(props.updateRole).toHaveBeenCalledWith("r1", "superadmin");
    });
  });

  it("deletes a role", async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    props.listRoles
      .mockResolvedValueOnce([{ id: "r1", name: "admin" }])
      .mockResolvedValueOnce([]);
    render(<RoleManagementPanel {...props} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(props.deleteRole).toHaveBeenCalledWith("r1");
    });
  });
});
