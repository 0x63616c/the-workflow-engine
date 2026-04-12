import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db } from "./client";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  await migrate(db, {
    migrationsFolder: resolve(__dirname, "./migrations"),
  });
}
