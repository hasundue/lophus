import { PublicKey, RelayUrl } from "@lophus/core/protocol";
import { parse } from "./contacts.ts";

Deno.bench("parse", () => {
  parse([
    "p",
    "npub..." as PublicKey,
    "wss://localhost:8080" as RelayUrl,
    "Alice",
  ]);
});
