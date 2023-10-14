import type { NostrMessage } from "./protocol.d.ts";
import type { Logger } from "./types.ts";
import { WebSocketLike, WebSocketReadyState } from "./websockets.ts";
import { NonExclusiveWritableStream } from "./streams.ts";

export interface NostrNodeConfig {
  logger: Logger;
  nbuffer: number;
}

export type NostrNodeOptions = Partial<NostrNodeConfig>;

/**
 * Common base class for relays and clients.
 */
export class NostrNode<
  W extends NostrMessage = NostrMessage,
  EventType extends string = string,
  F extends FunctionParameterTypeRecord = FunctionParameterTypeRecord,
> extends NonExclusiveWritableStream<W> {
  readonly config: Readonly<NostrNodeConfig>;
  protected readonly aborter = new AbortController();
  protected readonly functions: NostrNodeFunctionSet<F> = {};

  declare addEventListener: <E extends EventType>(
    type: E,
    listener: NostrNodeEventListenerOrEventListenerObject<E> | null,
    options?: boolean | AddEventListenerOptions,
  ) => void;

  declare removeEventListener: <E extends EventType>(
    type: E,
    listener: NostrNodeEventListenerOrEventListenerObject<E> | null,
    options?: boolean | EventListenerOptions,
  ) => void;

  declare dispatchEvent: <E extends EventType>(
    event: NostrNodeEvent<E>,
  ) => boolean;

  constructor(
    readonly ws: WebSocketLike,
    opts: NostrNodeOptions = {},
  ) {
    super({
      write: (msg) => this.ws.send(JSON.stringify(msg)),
      close: () => this.ws.close(),
    });
    this.config = { logger: {}, nbuffer: 10, ...opts };
  }

  get status(): WebSocketReadyState {
    return this.ws.readyState;
  }

  close() {
    this.aborter.abort();
    return super.close();
  }

  addExtension(extension: NostrNodeExtension<F>) {
    for (const name in extension) {
      this.addFunction(name, extension[name]!);
    }
  }

  addFunction<K extends FunctionKey<F>>(
    fname: K,
    fn: FunctionType<F, K>,
  ): void {
    const set = this.functions[fname] ?? (this.functions[fname] = new Set());
    set.add(fn);
  }

  protected async exec<K extends FunctionKey<F>>(
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
}

// ------------------------------
// Extensions
// ------------------------------

export interface NostrNodeExtensionModule {
  default: NostrNodeExtension;
}

export type NostrNodeExtension<
  R extends FunctionParameterTypeRecord = Record<string, never>,
> = {
  [K in FunctionKey<R>]: FunctionType<R, K>;
};

// ------------------------------
// Functions
// ------------------------------

type NostrNodeFunctionSet<R extends FunctionParameterTypeRecord> = Partial<
  {
    [K in FunctionKey<R>]: Set<FunctionType<R, K>>;
  }
>;

export type FunctionParameterTypeRecord = {
  [F in string]: FunctionParameterType;
};

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

type NostrNodeEventListenerOrEventListenerObject<
  EventType extends string = string,
> = NostrNodeEventListener<EventType> | NostrNodeEventListenerObject<EventType>;

type NostrNodeEvent<
  EventType extends string = string,
> = MessageEvent<NostrMessage & { __type__: EventType }>;

type NostrNodeEventListener<
  EventType extends string = string,
> = (
  this: NostrNode,
  ev: NostrNodeEvent<EventType>,
  // deno-lint-ignore no-explicit-any
) => any;

type NostrNodeEventListenerObject<
  EventType extends string = string,
> = {
  handleEvent(
    this: NostrNode,
    ev: NostrNodeEvent<EventType>,
    // deno-lint-ignore no-explicit-any
  ): any;
};
