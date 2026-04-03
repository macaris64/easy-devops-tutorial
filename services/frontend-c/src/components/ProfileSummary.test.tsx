import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileSummary } from "./ProfileSummary";

describe("ProfileSummary", () => {
  it("renders empty label", () => {
    render(<ProfileSummary user={null} />);
    expect(screen.getByTestId("profile-summary-empty")).toBeInTheDocument();
  });

  it("renders user and logout", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(
      <ProfileSummary
        user={{ username: "u", email: "u@u.com", roles: ["admin"] }}
        onLogout={onLogout}
      />,
    );
    expect(screen.getByTestId("profile-summary-roles")).toHaveTextContent("admin");
    await user.click(screen.getByTestId("profile-logout"));
    expect(onLogout).toHaveBeenCalled();
  });
});
