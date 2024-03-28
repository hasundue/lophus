/**
 * The entry point to the web resources of Lophus.
 *
 * @module
 */

interface HtmlModule {
  default: string;
}

async function html(path: string) {
  const { default: html } = await import(path) as HtmlModule;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

async function css(path: string) {
  return new Response(await Deno.readTextFile(path), {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
    },
  });
}

async function javascript(path: string) {
  const { transform } = await import("esbuild");
  const result = await transform(
    await Deno.readTextFile(path.replace(".js", ".ts")),
    { loader: "ts" },
  );
  return new Response(result.code, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
    },
  });
}

const handler: Deno.ServeHandler = (req) => {
  const url = new URL(req.url);

  const pathname = url.pathname;
  console.log(`${req.method} ${pathname}`);

  const routes = new Map<
    string,
    (params: Record<string, string | undefined>) => Response | Promise<Response>
  >();
  routes.set(
    "/app/scripts/:file",
    ({ file }) => javascript("./scripts/" + file),
  );
  routes.set(
    "/app/styles/:file",
    ({ file }) => css("./styles/" + file),
  );
  routes.set(
    "/app/:route",
    ({ route }) => html(`./routes/${route}.ts`),
  );
  routes.set(
    "/:page",
    ({ page }) => html(`./pages/${page}.ts`),
  );
  routes.set("/", () => html("./pages/home.ts"));

  for (const [pattern, handle] of routes) {
    const match = new URLPattern({ pathname: pattern }).exec(url);
    if (match) {
      return handle(match.pathname.groups);
    }
  }
  return new Response("Not Found", { status: 404 });
};

export default handler;

if (import.meta.main) {
  Deno.serve(handler);
}
