import { normalizeUserIdParam } from "../src/paramUtils";

describe("normalizeUserIdParam", () => {
  it("returns empty for undefined", () => {
    expect(normalizeUserIdParam(undefined)).toBe("");
  });

  it("trims string ids", () => {
    expect(normalizeUserIdParam("  abc  ")).toBe("abc");
  });

});
