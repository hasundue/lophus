import { bundle } from "https://deno.land/x/emit@0.22.0/mod.ts";
import { transform } from "https://deno.land/x/esbuild@v0.17.19/mod.js";

const result = await bundle(
  new URL("../client.ts", import.meta.url),
);
const { code } = result;

const minified = await transform(code, {
  minify: true,
});

console.log(minified.code);
Deno.exit(0);
