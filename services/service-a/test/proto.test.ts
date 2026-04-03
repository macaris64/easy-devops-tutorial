import path from "path";
import { loadUserServiceConstructor } from "../src/proto";

const userProto = path.join(__dirname, "fixtures", "user.proto");
const otherProto = path.join(__dirname, "fixtures", "other.proto");

describe("loadUserServiceConstructor", () => {
  it("loads UserService from fixture proto", () => {
    const Ctor = loadUserServiceConstructor(userProto);
    expect(typeof Ctor).toBe("function");
  });

  it("throws when UserService is missing", () => {
    expect(() => loadUserServiceConstructor(otherProto)).toThrow(
      /user\.v1\.UserService not found/
    );
  });
});
