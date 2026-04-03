/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/index.ts",
  ],
  // Avoid EACCES when ./coverage was created by Docker as root
  coverageDirectory: process.env.JEST_COVERAGE_DIR || "coverage",
  // Branch % stays slightly lower than lines: many handlers use `req.body ?? {}` and
  // optional fields; the meaningful paths (gRPC mapping, validation, 502) are covered.
  coverageThreshold: {
    global: {
      branches: 84,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  moduleFileExtensions: ["ts", "js", "json"],
};
