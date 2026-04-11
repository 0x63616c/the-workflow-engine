import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { db } from "../db/client";
import type * as schema from "../db/schema";

export interface Context {
  db: BunSQLiteDatabase<typeof schema>;
}

export function createContext(): Context {
  return { db };
}
