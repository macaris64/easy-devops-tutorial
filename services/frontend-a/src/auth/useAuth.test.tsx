import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAuth } from "./AuthContext";

function Consumer(): null {
  useAuth();
  return null;
}

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => render(<Consumer />)).toThrow(/useAuth must be used within AuthProvider/);
  });
});
