import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";
const level = process.env.LOG_LEVEL ?? (isDevelopment ? "debug" : "info");

/**
 * Server logger — plain pino only.
 * Do not use pino-pretty `transport` here: it spawns worker threads whose
 * entry path breaks under Next.js webpack (`.next/server/vendor-chunks/lib/worker.js`).
 */
export const logger = pino({ level });
