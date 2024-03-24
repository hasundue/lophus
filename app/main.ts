import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { streamSSE } from "hono/streaming";
import server from "./src/server.ts";
import { readable } from "./src/worker.ts";

const app = new Hono();

app.get("/", (c) => c.html(server));

app.get("/dist/*", serveStatic({ root: "./app" }));
app.get("/static/*", serveStatic({ root: "./app" }));

app.get("/events", (c) => {
  if (c.req.header("accept") === "text/event-stream") {
    return streamSSE(c, (stream) => {
      return readable().pipeTo(
        new WritableStream({
          write(chunk) {
            stream.writeSSE({ data: chunk });
          },
        }),
      );
    });
  }
  return c.text("Not Acceptable", 406);
});

Deno.serve(app.fetch);
