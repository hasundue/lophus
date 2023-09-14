import type {
  ClientToRelayMessage,
  RelayToClientMessage,
} from "./core/types.ts";
import { NostrNode, NostrNodeConfig } from "./core/nodes.ts";
import { LazyWebSocket } from "./core/websockets.ts";
import { Lock } from "./core/x/async.ts";

class ConnectionError extends Error {}

/**
 * A class that represents a remote Nostr client.
 */
export class Client extends NostrNode<RelayToClientMessage, LazyWebSocket> {
  constructor(
    ws: WebSocket,
    opts?: ClientOptions,
  ) {
    super( // new NostrNode(
      () => {
        if (ws.readyState >= WebSocket.CLOSING) {
          throw new ConnectionError("WebSocket is closing or closed");
        }
        return ws;
      },
      { nbuffer: 10, ...opts },
    );
    // const messenger = new Lock(this.getWriter());
    this.ws.addEventListener("message", (ev: MessageEvent<string>) => {
      // TODO: Validate the type of the message.
      const msg = JSON.parse(ev.data) as ClientToRelayMessage;
      // TODO: Apply backpressure when a queue is full.
      if (msg[0] === "EVENT") {
        // TODO: Handle event (write to stream, database, etc.).
        return;
      }
      const subid = msg[1];
    });
  }
}

export type ClientConfig = NostrNodeConfig;
export type ClientOptions = Partial<ClientConfig>;
