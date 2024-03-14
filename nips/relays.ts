import { NIPsEnabled } from "./nodes.ts";
import { Relay as CoreRelay } from "@lophus/core/relays";
import base from "./01/relays.ts";

export class Relay extends NIPsEnabled(CoreRelay, base, "relays.ts", [42]) {}
