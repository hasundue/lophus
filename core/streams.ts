import { push } from "./x/streamtools.ts";
import { Require } from "./types.ts";

export type BroadcastPromiseOperation<T> = keyof Pick<
  typeof Promise<T>,
  "all" | "race" | "any"
>;

export function broadcast<T = unknown>(
  source: ReadableStream<T>,
  targets: WritableStream<T>[],
  strategy: BroadcastPromiseOperation<T> = "all",
) {
  source.pipeTo(
    new WritableStream({
      write: async (msg) => {
        // @ts-ignore 2349 - TS doesn't handle a method union well
        await (Promise[strategy])(targets.map((target) => push(target, msg)));
      },
    }),
  );
}

export interface LophusReadableStreamQueuingThresholds {
  stop?: number;
  restart?: number;
}

export interface LophusReadableStreamUnderlyingSource<R extends unknown> {
  start: (
    controller: LophusReadableStreamController<R>,
  ) => void | Promise<void>;
  stop: (
    controller: LophusReadableStreamController<R>,
    chunk?: R,
  ) => void | Promise<void>;
  restart: (
    controller: LophusReadableStreamController<R>,
    chunk?: R,
  ) => void | Promise<void>;
  cancel?: UnderlyingSource<R>["cancel"];
}

export class LophusReadableStream<R extends unknown> extends ReadableStream<R> {
  constructor(
    source: LophusReadableStreamUnderlyingSource<R>,
    strategy?: LophusReadableStreamQueuingThresholds,
  ) {
    const stop = strategy?.stop ?? 20;
    super({
      start(controller) {
        source.start?.(
          new LophusReadableStreamController(
            controller,
            source,
            { ...strategy, stop },
          ),
        );
      },
      cancel: source.cancel,
    }, new CountQueuingStrategy({ highWaterMark: stop }));
  }
}

export class LophusReadableStreamController<R extends unknown>
  implements Omit<ReadableStreamDefaultController, "desiredSize"> {
  protected desiredSize: ReadableStreamDefaultController["desiredSize"];
  protected thresholds: Required<LophusReadableStreamQueuingThresholds>;
  protected backpressure_enabled = false;

  close: ReadableStreamDefaultController["close"];
  enqueue: ReadableStreamDefaultController["enqueue"];
  error: ReadableStreamDefaultController["error"];

  constructor(
    defaultController: ReadableStreamDefaultController<R>,
    protected pulling: Pick<
      LophusReadableStreamUnderlyingSource<R>,
      "stop" | "restart"
    >,
    strategy: Require<LophusReadableStreamQueuingThresholds, "stop">,
  ) {
    this.desiredSize = defaultController.desiredSize;
    this.close = defaultController.close.bind(defaultController);
    this.enqueue = defaultController.enqueue.bind(defaultController);
    this.error = defaultController.error.bind(defaultController);

    const restart = strategy?.restart ?? Math.floor(strategy.stop / 2);
    this.thresholds = { ...strategy, restart };
  }

  async adjustBackpressure(chunk?: R) {
    if (this.desiredSize === null) return;

    if (this.desiredSize <= 0) {
      await this.pulling.stop(this, chunk);
      this.backpressure_enabled = true;
    }
    if (this.desiredSize > this.thresholds.stop - this.thresholds.restart) {
      await this.pulling.restart(this, chunk);
      this.backpressure_enabled = false;
    }
  }
}
