//
// Generate the README.md for the project.
//
const srcs = [
  "../examples/global.ts",
  "../examples/pool.ts",
  "../examples/publish.ts",
  "../examples/echo.ts",
  "../examples/transfer.ts",
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
  new URL("../examples/README.md", import.meta.url),
  output,
);
