import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoleAssignmentForm } from "./RoleAssignmentForm";

describe("RoleAssignmentForm", () => {
  it("assigns selected role", async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn().mockResolvedValue(undefined);
    render(
      <RoleAssignmentForm
        roles={[
          { id: "r1", name: "Admin" },
          { id: "r2", name: "User" },
        ]}
        onAssign={onAssign}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox"), "r2");
    await user.click(screen.getByRole("button", { name: /assign role/i }));
    await waitFor(() => {
      expect(onAssign).toHaveBeenCalledWith("r2");
    });
  });
});
