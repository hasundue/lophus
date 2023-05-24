import { push } from "./x/streamtools.ts";

export type BroadcastPromiseOperation<T> = keyof Pick<
  typeof Promise<T>,
  "all" | "race" | "any"
>;

export function broadcast<T = unknown>(
  source: ReadableStream<T>,
  targets: WritableStream<T>[],
  strategy: BroadcastPromiseOperation<T> = "all",
) {
  return source.pipeTo(
    new WritableStream({
      write: (msg) => {
        // deno-lint-ignore no-explicit-any
        return (Promise[strategy] as any)(
          targets.map((target) => push(target, msg)),
        );
      },
    }),
  );
}

export type ImpatientStreamQueuingStrategy = {
  stop?: number;
  restart?: number;
};

export type ImpatientReadableStreamUnderlyingSource<R extends unknown> = {
  start: (
    controller: ImpatientReadableStreamController<R>,
  ) => void | Promise<void>;
  stop?: (
    chunk: R,
    controller: ImpatientReadableStreamController<R>,
  ) => void | Promise<void>;
  restart?: (
    contoller: TransformStreamDefaultController<R>,
  ) => void;
  cancel?: UnderlyingSource<R>["cancel"];
};

export function createImpatientReadableStream<R extends unknown>(
  source: ImpatientReadableStreamUnderlyingSource<R>,
  strategy?: ImpatientStreamQueuingStrategy,
): ReadableStream<R> {
  const stop = strategy?.stop ?? 20;
  const restart = strategy?.restart ?? Math.floor(stop / 2);

  const readable = new ReadableStream<R>({
    start(controller) {
      source.start?.(
        new ImpatientReadableStreamController<R>(controller, source.stop),
      );
    },
    cancel: source.cancel,
  }, new CountQueuingStrategy({ highWaterMark: stop }));

  const buffer = new TransformStream<R, R>({
    flush(controller) {
      source.restart?.(controller);
    },
  }, new CountQueuingStrategy({ highWaterMark: restart }));

  readable.pipeTo(buffer.writable);

  return buffer.readable;
}

class ImpatientReadableStreamController<R extends unknown>
  implements ReadableStreamDefaultController<R> {
  close: ReadableStreamDefaultController["close"];
  error: ReadableStreamDefaultController["error"];

  constructor(
    protected controller: ReadableStreamDefaultController<R>,
    protected stop: ImpatientReadableStreamUnderlyingSource<R>["stop"],
  ) {
    this.close = controller.close.bind(controller);
    this.error = controller.error.bind(controller);
  }

  get desiredSize() {
    return this.controller.desiredSize;
  }

  async enqueue(chunk: R) {
    this.controller.enqueue(chunk);

    if (this.desiredSize && this.desiredSize <= 0) {
      await this.stop?.(chunk, this);
    }
  }
}
