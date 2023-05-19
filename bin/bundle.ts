import { bundle } from "https://deno.land/x/emit@0.22.0/mod.ts";

const result = await bundle(
  new URL("../client.ts", import.meta.url),
);

const { code } = result;
console.log(code);
