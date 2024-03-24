import { NIPsEnabled } from "./nodes.ts";
import { Relay as CoreRelay } from "@lophus/core/relays";
import base from "./01/relays.ts";

export type { RelayLike } from "@lophus/core/relays";

export class Relay extends NIPsEnabled(CoreRelay, base, "relays.ts", [42]) {}
