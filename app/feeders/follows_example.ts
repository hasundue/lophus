import { PublicKey } from "@lophus/core/protocol";
import { ConsoleLogStream } from "@lophus/lib/streams";
import { watch } from "@lophus/std/watch";
import { Relay } from "@lophus/nips/relays";
import follows from "./follows.ts";

const relay = new Relay("wss://nostr.wine");
const pubkey =
  "c04330adadd9508c1ad1c6ede0aed5d922a3657021937e2055a80c1b2865ccf7" as PublicKey;

watch(relay)("receive").pipeTo(new ConsoleLogStream());

const stream = await follows({
  source: relay,
  me: pubkey,
  limit: 10,
});

await stream.pipeTo(new ConsoleLogStream());
