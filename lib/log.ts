import * as log from "https://deno.land/std@0.187.0/log/mod.ts";

const LOG_LEVEL = "DEBUG";

log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler(LOG_LEVEL, {
      formatter: "[{levelName}] {msg} {args}",
    }),
  },
  loggers: {
    default: {
      level: LOG_LEVEL,
      handlers: ["console"],
    },
  },
});

const logger = log.getLogger();

export { logger as log };
