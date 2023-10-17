import type { NostrMessage } from "./protocol.d.ts";
import type { Logger } from "./types.ts";
import { WebSocketLike } from "./websockets.ts";
import { NonExclusiveWritableStream } from "./streams.ts";

export interface NostrNodeConfig<
  F extends FunctionParameterTypeRecord = FunctionParameterTypeRecord,
> {
  modules: NostrNodeModule<F>[];
  logger: Logger;
  nbuffer: number;
}

export type NostrNodeOptions<
  F extends FunctionParameterTypeRecord = FunctionParameterTypeRecord,
> = Partial<NostrNodeConfig<F>>;

/**
 * Common base class for relays and clients.
 */
export class NostrNode<
  W extends NostrMessage = NostrMessage,
  E extends EventDataTypeRecord = EventDataTypeRecord,
  F extends FunctionParameterTypeRecord = FunctionParameterTypeRecord,
> extends NonExclusiveWritableStream<W> {
  readonly config: Readonly<NostrNodeConfig<F>>;
  protected readonly functions: NostrNodeFunctionSet<F> = {};
  protected readonly aborter = new AbortController();

  constructor(
    readonly ws: WebSocketLike,
    opts: NostrNodeOptions<F> = {},
  ) {
    super({
      write: (msg) => this.ws.send(JSON.stringify(msg)),
      close: () => this.ws.close(),
    });
    this.config = { modules: [], logger: {}, nbuffer: 10, ...opts };
    this.config.modules.forEach((m) => this.addModule(m));
  }

  get status(): WebSocket["readyState"] {
    return this.ws.readyState;
  }

  close() {
    this.aborter.abort();
    return super.close();
  }

  addModule(module: NostrNodeModule<F>) {
    const functions = module.default;
    for (const name in functions) {
      this.addFunction(name, functions[name]!);
    }
  }

  addFunction<K extends FunctionKey<F>>(
    fname: K,
    fn: FunctionType<F, K>,
  ): void {
    const set = this.functions[fname] ?? (this.functions[fname] = new Set());
    set.add(fn);
  }

  async callFunction<K extends FunctionKey<F>>(
    fname: K,
    context: F[K],
  ): Promise<void> {
    const handlers = this.functions[fname];
    if (handlers) {
      await Promise.all(
        [...handlers].map((handler) => handler({ __fn__: fname, ...context })),
      );
    }
  }

  override addEventListener = <T extends EventType<E>>(
    type: T,
    listener: NostrNodeEventListenerOrEventListenerObject<E, T> | null,
    options?: AddEventListenerOptions,
  ) => {
    super.addEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      { signal: this.aborter.signal, ...options },
    );
  };

  declare removeEventListener: <T extends EventType<E>>(
    type: T,
    listener: NostrNodeEventListenerOrEventListenerObject<E, T> | null,
    options?: boolean | EventListenerOptions,
  ) => void;

  declare dispatchEvent: <T extends EventType<E>>(
    event: NostrNodeEvent<E, T>,
  ) => boolean;
}

// ------------------------------
// Extensions
// ------------------------------

export interface NostrNodeModule<
  R extends FunctionParameterTypeRecord,
> {
  default: NostrNodeFunctions<R>;
}

type NostrNodeFunctions<
  R extends FunctionParameterTypeRecord = FunctionParameterTypeRecord,
> = {
  [K in FunctionKey<R>]?: FunctionType<R, K>;
};

// ------------------------------
// Functions
// ------------------------------

type NostrNodeFunctionSet<R extends FunctionParameterTypeRecord> = Partial<
  {
    [K in FunctionKey<R>]: Set<FunctionType<R, K>>;
  }
>;

interface FunctionParameterTypeRecord {
  [K: string]: FunctionParameterType;
}

// deno-lint-ignore no-empty-interface
interface FunctionParameterType {}

type FunctionKey<R extends FunctionParameterTypeRecord> = keyof R & string;

type FunctionContextType<
  R extends FunctionParameterTypeRecord,
  K extends FunctionKey<R>,
> = R[K] & { __fn__: K };

type FunctionType<
  R extends FunctionParameterTypeRecord,
  K extends FunctionKey<R>,
> = (context: FunctionContextType<R, K>) => void;

// ------------------------------
// Events
// ------------------------------

type EventDataTypeRecord = Record<string, MessageEventInit["data"]>;

type EventType<R extends EventDataTypeRecord> = keyof R & string;

type NostrNodeEventListenerOrEventListenerObject<
  R extends EventDataTypeRecord,
  T extends EventType<R>,
> = NostrNodeEventListener<R, T> | NostrNodeEventListenerObject<R, T>;

type NostrNodeEventListener<
  R extends EventDataTypeRecord,
  T extends EventType<R>,
> // deno-lint-ignore no-explicit-any
 = (this: NostrNode, ev: NostrNodeEvent<R, T>) => any;

type NostrNodeEventListenerObject<
  R extends EventDataTypeRecord,
  T extends EventType<R>,
> = {
  // deno-lint-ignore no-explicit-any
  handleEvent(this: NostrNode, ev: NostrNodeEvent<R, T>): any;
};

export class NostrNodeEvent<
  R extends EventDataTypeRecord,
  T extends EventType<R>,
> extends MessageEvent<R[T]> {}
