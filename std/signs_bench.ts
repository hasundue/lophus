import { generatePrivateKey } from "./signs.ts";

Deno.bench({
  name: "generatePrivateKey",
  group: "generation",
  baseline: true,
  fn() {
    generatePrivateKey();
  },
});

Deno.bench({
  name: "crypto.randomUUID",
  group: "generation",
  fn() {
    crypto.randomUUID();
  },
});
