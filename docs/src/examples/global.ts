// Global timeline streaming
import { Relay } from "../../../client.ts";
import { Timestamp } from "../../../lib/times.ts";
import { ConsoleLogger } from "../../../lib/logging.ts";

new Relay("wss://nos.lol")
  .subscribe({ kinds: [1], since: Timestamp.now })
  .pipeTo(new ConsoleLogger());
