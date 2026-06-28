import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const rootDir = path.resolve(__dirname, "..");

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["components/**/*.test.tsx", "components/**/*.test.ts"],
    setupFiles: ["config/vitest.component.setup.tsx"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
