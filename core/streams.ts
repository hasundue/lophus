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

export type DwStreamWatermarks = {
  high: number;
  low?: number;
};

export type DwUnderlyingSource<R extends unknown> = {
  start: (
    controller: DwReadableStreamController<R>,
  ) => void | Promise<void>;
  stop?: (
    chunk: R,
    controller: DwReadableStreamController<R>,
  ) => void | Promise<void>;
  restart?: (
    contoller: TransformStreamDefaultController<R>,
  ) => void;
  cancel?: UnderlyingSource<R>["cancel"];
};

export function createDwReadableStream<R extends unknown>(
  source: DwUnderlyingSource<R>,
  marks: DwStreamWatermarks,
): ReadableStream<R> {
  const low = marks?.low ?? Math.floor(marks.high / 2);

  const readable = new ReadableStream<R>({
    start(controller) {
      source.start?.(
        new DwReadableStreamController<R>(controller, source.stop),
      );
    },
    cancel: source.cancel,
  }, new CountQueuingStrategy({ highWaterMark: marks.high }));

  const buffer = new TransformStream<R, R>({
    flush(controller) {
      source.restart?.(controller);
    },
  }, new CountQueuingStrategy({ highWaterMark: marks.high - low }));

  readable.pipeTo(buffer.writable);

  return buffer.readable;
}

class DwReadableStreamController<R extends unknown>
  implements ReadableStreamDefaultController<R> {
  close: ReadableStreamDefaultController["close"];
  error: ReadableStreamDefaultController["error"];

  constructor(
    protected controller: ReadableStreamDefaultController<R>,
    protected stop: DwUnderlyingSource<R>["stop"],
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
