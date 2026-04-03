import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory:
        process.env.VITEST_COVERAGE_DIR || "coverage",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/test/**",
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 78,
        statements: 80,
      },
    },
  },
});
