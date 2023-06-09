//
// Generate docs/EXAMPLES.md
//
const srcs = [
  "../docs/src/examples/global.ts",
  "../docs/src/examples/pool.ts",
  "../docs/src/examples/publish.ts",
  "../docs/src/examples/echo.ts",
  "../docs/src/examples/transfer.ts",
] as const;

const ts_begin = "```ts";
const ts_end = "```";

const texts = srcs.map((path) => {
  const text = Deno.readTextFileSync(new URL(path, import.meta.url));
  const lines = text.split("\n");
  const title = lines[0].replace("// ", "### ");
  return [title, ts_begin, ...lines.slice(1), ts_end].join("\n") + "\n";
});

const output = "## Examples\n" +
  texts.join("\n");

Deno.writeTextFileSync(
  new URL("../docs/EXAMPLES.md", import.meta.url),
  output,
);
