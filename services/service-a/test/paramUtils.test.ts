import { pickQueryString } from "../src/paramUtils";

describe("pickQueryString", () => {
  it("returns undefined for empty", () => {
    expect(pickQueryString(undefined)).toBeUndefined();
    expect(pickQueryString("")).toBeUndefined();
    expect(pickQueryString("   ")).toBeUndefined();
    expect(pickQueryString(1)).toBeUndefined();
  });

  it("trims string", () => {
    expect(pickQueryString("  x  ")).toBe("x");
  });

  it("uses first array element", () => {
    expect(pickQueryString(["  y  ", "z"])).toBe("y");
  });
});
