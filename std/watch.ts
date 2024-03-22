import { WebSocketEventType, WebSocketLike } from "@lophus/lib/websockets";
import { AnyEventTypeRecord } from "@lophus/core/nodes";
import { EventType, Node, NodeEvent } from "@lophus/core/nodes";
import type { InterNodeMessage } from "@lophus/core/protocol";

interface WatchNodeChainable<
  R extends AnyEventTypeRecord,
> {
  <T extends EventType<R>>(...events: T[]): ReadableStream<NodeEvent<R, T>>;
}

interface WatchWebSocketChainable {
  <T extends WebSocketEventType>(
    ...events: T[]
  ): ReadableStream<WebSocketEventMap[T]>;
}

export function watch<R extends AnyEventTypeRecord>(
  ...nodes: Node<InterNodeMessage, R>[]
): WatchNodeChainable<R>;

export function watch(
  ...wss: WebSocketLike[]
): WatchWebSocketChainable;

export function watch<R extends AnyEventTypeRecord>(
  ...targets: Node<InterNodeMessage, R>[] | WebSocketLike[]
): WatchNodeChainable<R> | WatchWebSocketChainable {
  const aborter = new AbortController();
  return <T extends EventType<R> | WebSocketEventType>(
    ...events: T[]
  ) => {
    return new ReadableStream(
      {
        start(controller) {
          targets.forEach((target) =>
            events.forEach((type) =>
              // @ts-ignore we do not type this strictly for readability
              target.addEventListener(type, (event) => {
                // de-prioritize to regular listeners
                queueMicrotask(() => controller.enqueue(event));
              }, { signal: aborter.signal })
            )
          );
        },
        cancel() {
          aborter.abort();
        },
      },
    );
  };
}
