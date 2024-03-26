/**
 * The main server of the Lophus web site.
 *
 * @module
 */
import { transform } from "esbuild";

async function html(source: string) {
  const { default: html } = await import(
    new URL("./src/server" + source, import.meta.url).href
  );
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

async function javascript(source: string) {
  const ts = source.replace(".js", ".ts");
  const result = await transform(
    await Deno.readTextFile(new URL("./src/client" + ts, import.meta.url)),
    { loader: "ts" },
  );
  return new Response(result.code, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
    },
  });
}

Deno.serve(async ({ url, method }) => {
  const { pathname } = new URL(url);
  console.log(`${method} ${pathname}`);

  if (pathname.endsWith(".js")) {
    return javascript(pathname);
  }

  if (pathname.endsWith(".css")) {
    return new Response(
      await Deno.readTextFile(new URL(`./static/${pathname}`, import.meta.url)),
      {
        headers: {
          "Content-Type": "text/css; charset=utf-8",
        },
      },
    );
  }

  if (pathname === "/") {
    return html("/index/home.ts");
  }
  if (pathname === "/app") {
    return html("/index/app.ts");
  }

  return new Response("Not found", { status: 404 });
});
