/**
 * The entry point to the web resources of Lophus.
 *
 * @module
 */

import { omit } from "@std/collections";

interface HtmlModule {
  default: (
    props: Record<string, string | undefined>,
    body?: string,
  ) =>
    | null
    | string
    | Promise<string>
    | ReadableStream<Uint8Array>
    | Promise<ReadableStream<Uint8Array>>;
}

async function html(
  path: string,
  props: Record<string, string | undefined> = {},
  body?: Request["body"],
) {
  const { default: html } = await import(path) as HtmlModule;
  const data = body
    ? (await Array.fromAsync(
      body.pipeThrough(new TextDecoderStream()),
    )).join("")
    : undefined;
  return new Response(await html(props, data), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

interface DataModule {
  default: (
    props: Record<string, string | undefined>,
  ) => Response | Promise<Response>;
}

async function data(
  path: string,
  props: Record<string, string | undefined> = {},
) {
  const { default: data } = await import(path) as DataModule;
  return data(props);
}

async function css(path: string) {
  return new Response(await Deno.readTextFile(new URL(path, import.meta.url)), {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
    },
  });
}

async function javascript(path: string) {
  const { transform } = await import("esbuild");
  const result = await transform(
    await Deno.readTextFile(
      new URL(path.replace(".js", ".ts"), import.meta.url),
    ),
    { loader: "ts" },
  );
  return new Response(result.code, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
    },
  });
}

const handler: Deno.ServeHandler = (req) => {
  const method = req.method;
  const url = new URL(req.url);

  const pathname = url.pathname;
  console.log(`${method} ${pathname}`);

  const routes = new Map<
    string,
    (params: Record<string, string | undefined>) => Response | Promise<Response>
  >();
  routes.set(
    "/app/users/:pubkey/:resource{/:id}?",
    (params) =>
      html(
        `./resources/${params.resource}.ts`,
        { method, ...omit(params, ["resource"]) },
        req.body,
      ),
  );
  routes.set(
    "/app/data/:resource/:id",
    ({ resource, id }) => data(`./resources/${resource}.ts`, { id }),
  );
  routes.set(
    "*/favicon.ico",
    () => new Response("Not Found", { status: 404 }),
  );
  routes.set(
    "/app/scripts/:file",
    ({ file }) => javascript("./scripts/" + file),
  );
  routes.set(
    "/app/styles/:file",
    ({ file }) => css("./styles/" + file),
  );
  routes.set(
    "/app/:page",
    ({ page }) => html(`./pages/${page}.ts`),
  );
  routes.set(
    "/:page",
    ({ page }) => html(`./pages/${page}.ts`),
  );
  routes.set("/", () => html("./pages/home.ts"));

  for (const [pattern, route] of routes) {
    const match = new URLPattern({ pathname: pattern }).exec(url);
    if (match) {
      const search = new URLSearchParams(match.search.input);
      return route({
        ...match.pathname.groups,
        ...Object.fromEntries(search),
      });
    }
  }
  return new Response("Not Found", { status: 404 });
};

export default handler;

if (import.meta.main) {
  Deno.serve(handler);
}
