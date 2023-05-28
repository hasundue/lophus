//
// Run an example script.
//
const name = Deno.args[0];
const url = new URL(`../examples/${name}.ts`, import.meta.url);

const command = new Deno.Command(Deno.execPath(), {
  args: [
    "run",
    "-A",
    url.toString(),
  ],
  stdout: "inherit",
});

const child = command.spawn();
await child.status;

Deno.exit(0);
