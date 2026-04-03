import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("submits trimmed username and password", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/username/i), "  alice  ");
    await user.type(screen.getByLabelText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ username: "alice", password: "secret" });
    });
  });

  it("shows error message", () => {
    render(<LoginForm onSubmit={vi.fn()} errorMessage="bad" />);
    expect(screen.getByTestId("login-form-error")).toHaveTextContent("bad");
  });
});
