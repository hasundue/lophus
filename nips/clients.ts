import { NIPsEnabled } from "./nodes.ts";
import { Client as CoreClient } from "@lophus/core/clients";
import base from "./01/clients.ts";

export class Client extends NIPsEnabled(CoreClient, base, "clients.ts", []) {}
