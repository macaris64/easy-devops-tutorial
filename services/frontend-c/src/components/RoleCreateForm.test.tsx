import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoleCreateForm } from "./RoleCreateForm";

describe("RoleCreateForm", () => {
  it("submits trimmed name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RoleCreateForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/role name/i), "  editor  ");
    await user.click(screen.getByRole("button", { name: /create role/i }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "editor" });
  });
});
