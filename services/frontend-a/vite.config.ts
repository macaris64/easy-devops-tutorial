import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@easy-devops/user-panel": path.resolve(
        __dirname,
        "../frontend-c/src/index.ts",
      ),
      "@easy-devops/log-panel": path.resolve(
        __dirname,
        "../frontend-b/src/index.ts",
      ),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
