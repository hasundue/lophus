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
        // @ts-ignore 2349 - TS doesn't handle a method union well
        return (Promise[strategy])(targets.map((target) => push(target, msg)));
      },
    }),
  );
}

export interface ImpatientReadableStreamUnderlyingSource<R extends unknown> {
  start: (
    controller: ImpatientReadableStreamController<R>,
  ) => void | Promise<void>;
  stop?: (
    controller: ImpatientReadableStreamController<R>,
    chunk?: R,
  ) => void;
  restart?: (
    contoller: TransformStreamDefaultController<R>,
  ) => void;
  cancel?: UnderlyingSource<R>["cancel"];
}

export interface ImpatientReadableStreamQueuingThresholds {
  stop?: number;
  restart?: number;
}

export function createImpatientReadableStream<R extends unknown>(
  source: ImpatientReadableStreamUnderlyingSource<R>,
  strategy?: ImpatientReadableStreamQueuingThresholds,
): ReadableStream<R> {
  const stop = strategy?.stop ?? 20;
  const restart = strategy?.restart ?? Math.floor(stop / 2);

  const readable = new ReadableStream<R>({
    start(controller) {
      source.start?.(
        new ImpatientReadableStreamController(controller, source.stop),
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

  enqueue(chunk: R) {
    this.controller.enqueue(chunk);

    if (this.desiredSize && this.desiredSize <= 0) {
      this.stop?.(this, chunk);
    }
  }
}
