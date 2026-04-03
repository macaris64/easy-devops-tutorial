import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AdminLayout } from "./AdminLayout";

describe("AdminLayout", () => {
  it("marks active nav link", () => {
    render(
      <MemoryRouter initialEntries={["/users"]}>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route path="users" element={<div>users page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("users page")).toBeInTheDocument();
    const usersLink = screen.getByRole("link", { name: "Users" });
    expect(usersLink).toHaveClass("active");
  });
});
