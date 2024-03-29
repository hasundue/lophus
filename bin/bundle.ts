import { bundle } from "https://deno.land/x/emit@0.38.2/mod.ts";
import { transform } from "https://deno.land/x/esbuild@v0.20.1/mod.js";

const result = await bundle(
  new URL("../core/relays.ts", import.meta.url),
);
const { code } = result;

Deno.writeTextFileSync(
  new URL("../dist/client.js", import.meta.url),
  code,
);

const minified = await transform(code, {
  minify: true,
});

Deno.writeTextFileSync(
  new URL("../dist/client.min.js", import.meta.url),
  minified.code,
);

Deno.exit(0);
