import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders home by default", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Admin dashboard" }),
    ).toBeInTheDocument();
  });

  it("renders users route", () => {
    render(
      <MemoryRouter initialEntries={["/users"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
  });
});
