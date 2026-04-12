import { asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { countdownEvents } from "../db/schema";
import type * as schema from "../db/schema";

type DB = NodePgDatabase<typeof schema>;

interface CountdownEventInput {
  title: string;
  date: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createCountdownEvent(db: DB, input: CountdownEventInput) {
  const rows = await db
    .insert(countdownEvents)
    .values({ title: input.title, date: input.date })
    .returning();
  return rows[0];
}

export async function listUpcomingCountdownEvents(db: DB) {
  return db
    .select()
    .from(countdownEvents)
    .where(gte(countdownEvents.date, todayISO()))
    .orderBy(asc(countdownEvents.date));
}

export async function listPastCountdownEvents(db: DB) {
  return db
    .select()
    .from(countdownEvents)
    .where(lt(countdownEvents.date, todayISO()))
    .orderBy(desc(countdownEvents.date));
}

export async function getCountdownEventById(db: DB, id: number) {
  const rows = await db.select().from(countdownEvents).where(eq(countdownEvents.id, id));
  if (rows.length === 0) {
    throw new Error(`Countdown event with id ${id} not found`);
  }
  return rows[0];
}

export async function updateCountdownEvent(db: DB, id: number, input: CountdownEventInput) {
  await getCountdownEventById(db, id);

  const rows = await db
    .update(countdownEvents)
    .set({
      title: input.title,
      date: input.date,
      updatedAt: sql`now()`,
    })
    .where(eq(countdownEvents.id, id))
    .returning();
  return rows[0];
}

export async function removeCountdownEvent(db: DB, id: number) {
  await getCountdownEventById(db, id);
  await db.delete(countdownEvents).where(eq(countdownEvents.id, id));
}
