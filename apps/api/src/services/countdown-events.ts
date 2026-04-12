import { asc, desc, gte, lt, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

import { countdownEvents } from "../db/schema";

// biome-ignore lint/suspicious/noExplicitAny: accepts any drizzle sqlite db (bun-sqlite or better-sqlite3)
type DB = BaseSQLiteDatabase<any, any, any>;

interface CountdownEventInput {
  title: string;
  date: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createCountdownEvent(db: DB, input: CountdownEventInput) {
  return db
    .insert(countdownEvents)
    .values({ title: input.title, date: input.date })
    .returning()
    .get();
}

export function listUpcomingCountdownEvents(db: DB) {
  return db
    .select()
    .from(countdownEvents)
    .where(gte(countdownEvents.date, todayISO()))
    .orderBy(asc(countdownEvents.date))
    .all();
}

export function listPastCountdownEvents(db: DB) {
  return db
    .select()
    .from(countdownEvents)
    .where(lt(countdownEvents.date, todayISO()))
    .orderBy(desc(countdownEvents.date))
    .all();
}

export function getCountdownEventById(db: DB, id: number) {
  const event = db.select().from(countdownEvents).where(sql`${countdownEvents.id} = ${id}`).get();

  if (!event) {
    throw new Error(`Countdown event with id ${id} not found`);
  }

  return event;
}

export function updateCountdownEvent(db: DB, id: number, input: CountdownEventInput) {
  getCountdownEventById(db, id);

  return db
    .update(countdownEvents)
    .set({
      title: input.title,
      date: input.date,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(sql`${countdownEvents.id} = ${id}`)
    .returning()
    .get();
}

export function removeCountdownEvent(db: DB, id: number) {
  getCountdownEventById(db, id);

  db.delete(countdownEvents).where(sql`${countdownEvents.id} = ${id}`).run();
}
