import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { log } from "../lib/logger";
import { db } from "./client";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const folder = resolve(__dirname, "./migrations");
  log.info({ folder }, "Running database migrations");
  await migrate(db, { migrationsFolder: folder });
  log.info("Database migrations complete");
}
