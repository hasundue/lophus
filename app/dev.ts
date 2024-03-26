import { bundle } from "https://deno.land/x/emit@0.38.2/mod.ts";
import { parseArgs } from "@std/cli";
import { basename, extname } from "@std/path";

const BUILD_TARGETS = [
  "./src/client.ts",
  "./src/client/index.ts",
];

const BUILD_TARGETS_DEV = [
  "./src/client/hmr.ts",
];

async function _bundle(path: string, minify = false) {
  const ext = extname(path);
  const name = basename(path).slice(0, -ext.length);

  const { code } = await bundle(
    new URL(path, import.meta.url),
    {
      minify,
      importMap: "./deno.json",
    },
  );
  await Deno.writeTextFile(
    new URL(`./dist/${name}${minify ? ".min" : ""}.js`, import.meta.url),
    code,
  );
}

async function _build() {
  await Promise.all(BUILD_TARGETS.flatMap((path) => [
    _bundle(path, false),
    _bundle(path, true),
  ]));
}

async function _build_dev() {
  await Promise.all(
    [...BUILD_TARGETS, ...BUILD_TARGETS_DEV].map((path) => _bundle(path)),
  );
}

async function _watch({ debounce = 1000 } = {}) {
  const paths = BUILD_TARGETS.map((path) =>
    new URL(path, import.meta.url).pathname
  );
  const watcher = Deno.watchFs(paths);
  let lastRun = 0;
  for await (const event of watcher) {
    if (event.kind !== "modify") {
      continue;
    }
    const now = Date.now();
    if (now - lastRun < debounce) {
      continue;
    }
    lastRun = now;
    console.log("Rebuilding...");
    await _build_dev();
    console.log("Done.");
  }
}

function _run({ config = "../deno.json" } = {}) {
  new Deno.Command("deno", {
    args: ["task", "--config", config, "run"],
  }).spawn();
}

if (import.meta.main) {
  const args = parseArgs(Deno.args);
  const cmd = args._.shift();
  if (cmd === "help" || cmd === undefined) {
    console.log(`Usage: dev <command> [options]

Commands:
  build  Build the project
  run    Run the server and watch for changes to rebuild the project

Options:
  --config <file>  Specify the configuration file`);
    Deno.exit(0);
  }
  switch (cmd) {
    case "build":
      await _build();
      break;
    case "run": {
      await _build_dev();
      _run({ config: "config" in args ? args.config : "../deno.json" });
      await _watch();
      break;
    }
    default:
      console.error(`Unknown command: ${cmd}`);
  }
}
