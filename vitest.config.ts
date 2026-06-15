import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

// Parse .env.local at config time and inject into the test environment, so
// module-level Supabase clients have the URL/keys on import. Dependency-free
// so it doesn't depend on Next's env loader resolving in the Vitest context.
function loadEnvLocal(): Record<string, string> {
  try {
    const text = readFileSync(fileURLToPath(new URL("./.env.local", import.meta.url)), "utf8");
    const env: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    return env;
  } catch {
    return {};
  }
}

export default defineConfig({
  test: {
    environment: "node",
    env: loadEnvLocal(),
  },
  resolve: {
    // fileURLToPath (not .pathname) so spaces in the project path don't stay %20-encoded.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
