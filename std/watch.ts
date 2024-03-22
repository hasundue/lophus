import { AnyEventTypeRecord } from "@lophus/core/nodes";
import { EventType, Node, NodeEvent } from "@lophus/core/nodes";
import type { InterNodeMessage } from "@lophus/core/protocol";

interface WatchChainable<
  R extends AnyEventTypeRecord,
> {
  <T extends EventType<R>>(...events: T[]): ReadableStream<NodeEvent<R, T>>;
}

export function watch<R extends AnyEventTypeRecord>(
  ...nodes: Node<InterNodeMessage, R>[]
): WatchChainable<R> {
  const aborter = new AbortController();
  return <T extends EventType<R>>(...events: T[]) =>
    new ReadableStream<NodeEvent<R, T>>({
      start(controller) {
        nodes.forEach((node) =>
          events.forEach((type) =>
            node.addEventListener(type, (event) => {
              // De-prioritize to regular listeners
              queueMicrotask(() => controller.enqueue(event));
            }, { signal: aborter.signal })
          )
        );
      },
      cancel() {
        aborter.abort();
      },
    });
}
