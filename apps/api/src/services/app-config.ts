import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { appConfig } from "../db/schema";
import type * as schema from "../db/schema";

type DB = NodePgDatabase<typeof schema>;

export type ConfigValue = string | number | boolean | null;

export async function getConfig(db: DB, key: string): Promise<ConfigValue> {
  const rows = await db.select().from(appConfig).where(eq(appConfig.key, key));
  if (rows.length === 0) return null;
  return rows[0].value as ConfigValue;
}

export async function setConfig(db: DB, key: string, value: ConfigValue): Promise<void> {
  await db
    .insert(appConfig)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getAllConfig(db: DB): Promise<Record<string, ConfigValue>> {
  const rows = await db.select().from(appConfig);
  const result: Record<string, ConfigValue> = {};
  for (const row of rows) {
    result[row.key] = row.value as ConfigValue;
  }
  return result;
}
