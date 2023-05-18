/**
 * Logging utilities
 */
const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = typeof LOG_LEVELS[number];

const LOG_LEVEL = Deno.env.get("LOG_LEVEL") || "info";
