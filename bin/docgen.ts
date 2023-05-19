//
// Generate the README.md for the project.
//
import { mapValues } from "https://deno.land/std@0.187.0/collections/map_values.ts";

const files_md = {
  head: "../docs/head.md",
  nips: "../docs/nips.md",
} as const;

const texts_md = mapValues(
  files_md,
  (path) => Deno.readTextFileSync(new URL(path, import.meta.url)) + "\n",
);

const files_ts = [
  "../examples/global.ts",
  "../examples/publish.ts",
  "../examples/echo.ts",
  "../examples/transfer.ts",
] as const;

const ts_begin = "```ts";
const ts_end = "```";

const texts_ts = files_ts.map((path) => {
  const text = Deno.readTextFileSync(new URL(path, import.meta.url));
  const lines = text.split("\n");
  const title = lines[0].replace("// ", "### ");
  return [title, ts_begin, ...lines.slice(1), ts_end].join("\n") + "\n";
});

const output = texts_md.head +
  "## Examples\n" +
  texts_ts.join("\n") +
  texts_md.nips;

console.log(output);
