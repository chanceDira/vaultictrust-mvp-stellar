import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["services/**/*.ts", "utils/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "~~": path.resolve(__dirname, "./"),
    },
  },
});
