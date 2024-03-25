import { isLimited } from "./filters.ts";

Deno.bench("isLimited - a single filter", () => {
  isLimited({ limit: 10 });
});

Deno.bench("isLimited - two filters", () => {
  isLimited([
    { limit: 10 },
    { kinds: [0] },
  ]);
});
