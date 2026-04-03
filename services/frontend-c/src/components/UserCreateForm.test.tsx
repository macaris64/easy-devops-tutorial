import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserCreateForm } from "./UserCreateForm";

describe("UserCreateForm", () => {
  it("submits trimmed username and email", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<UserCreateForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/username/i), "  bob  ");
    await user.type(screen.getByLabelText(/email/i), "  bob@x.test  ");
    await user.click(screen.getByRole("button", { name: /create user/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      username: "bob",
      email: "bob@x.test",
    });
  });

  it("shows server error when provided", () => {
    render(
      <UserCreateForm onSubmit={() => undefined} errorMessage="Bad request" />,
    );
    expect(screen.getByTestId("form-error")).toHaveTextContent("Bad request");
  });
});
