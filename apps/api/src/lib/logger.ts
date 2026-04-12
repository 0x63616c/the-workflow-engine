import pino from "pino";

const VALID_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"];
const rawLevel = process.env.LOG_LEVEL;
const level = rawLevel && VALID_LEVELS.includes(rawLevel) ? rawLevel : "info";

export const log = pino({ level });
