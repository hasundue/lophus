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

export interface LophusReadableStreamQueuingStrategy<R> {
  stop?: number;
  applyBackpressure: (chunk: R) => void | Promise<void>;
  restart?: number;
  releaseBackpressure: (chunk: R) => void | Promise<void>;
}

export class LophusReadableStream<R extends unknown> extends ReadableStream<R> {
  constructor(
    source: {
      start?: (controller: NostrReadableStreamController<R>) => void;
      cancel?: UnderlyingSource<R>["cancel"];
    },
    strategy: LophusReadableStreamQueuingStrategy<R>,
  ) {
    const stop = strategy?.stop ?? 20;
    super({
      start(controller) {
        source.start?.(
          new NostrReadableStreamController(controller, { ...strategy, stop }),
        );
      },
      cancel: source.cancel,
    }, new CountQueuingStrategy({ highWaterMark: stop }));
  }
}

export class NostrReadableStreamController<R extends unknown>
  implements Omit<ReadableStreamDefaultController, "desiredSize"> {
  protected desiredSize: ReadableStreamDefaultController["desiredSize"];
  protected strategy: Required<LophusReadableStreamQueuingStrategy<R>>;
  protected backpressure_enabled = false;

  close: ReadableStreamDefaultController["close"];
  enqueue: ReadableStreamDefaultController["enqueue"];
  error: ReadableStreamDefaultController["error"];

  constructor(
    defaultController: ReadableStreamDefaultController<R>,
    strategy: Require<LophusReadableStreamQueuingStrategy<R>, "stop">,
  ) {
    this.desiredSize = defaultController.desiredSize;
    this.close = defaultController.close.bind(defaultController);
    this.enqueue = defaultController.enqueue.bind(defaultController);
    this.error = defaultController.error.bind(defaultController);

    const restart = strategy?.restart ?? Math.floor(strategy.stop / 2);
    this.strategy = { ...strategy, restart };
  }

  async adjustBackpressure(chunk: R) {
    if (this.desiredSize === null) return;

    if (this.desiredSize <= 0) {
      await this.strategy.applyBackpressure(chunk);
      this.backpressure_enabled = true;
    }
    if (this.desiredSize > this.strategy.stop - this.strategy.restart) {
      await this.strategy.releaseBackpressure(chunk);
      this.backpressure_enabled = false;
    }
  }
}
