import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    // fileURLToPath (not .pathname) so spaces in the project path don't stay %20-encoded.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
