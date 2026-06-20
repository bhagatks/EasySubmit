import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = path.resolve(__dirname, "..");

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
