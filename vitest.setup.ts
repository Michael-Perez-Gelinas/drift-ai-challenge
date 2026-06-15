import { loadEnvConfig } from "@next/env";

// Loads .env.local exactly like Next does, so integration tests get the
// Supabase URL and keys without a separate test env file.
loadEnvConfig(process.cwd());
