//
// Generate the README.md for the project.
//
import { mapValues } from "https://deno.land/std@0.187.0/collections/map_values.ts";

const sources = {
  head_md: "../docs/head.md",
  example_global_ts: "../examples/global.ts",
  example_publish_ts: "../examples/publish.ts",
  example_transfer_ts: "../examples/transfer.ts",
  nips_md: "../docs/nips.md",
  links_md: "../docs/links.md",
} as const;

const contents = mapValues(
  sources,
  (path) => Deno.readTextFileSync(new URL(path, import.meta.url)),
);

const ts_begin = "```ts";
const ts_end = "```";

const output = `${contents.head_md}
## Examples
### Global feed
${ts_begin}
${contents.example_global_ts}
${ts_end}
### Publish
${ts_begin}
${contents.example_publish_ts}
${ts_end}
### Transfer
${ts_begin}
${contents.example_transfer_ts}
${ts_end}
${contents.nips_md}
${contents.links_md}
`;

console.log(output);
