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
  FunctionType extends string = string,
> extends NonExclusiveWritableStream<W> {
  readonly config: Readonly<NostrNodeConfig>;
  protected readonly aborter = new AbortController();
  protected readonly functions: NostrNodeFunctionSet<FunctionType> = {};

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

  protected addExtension(extension: NostrNodeExtension<FunctionType>) {
    for (const name in extension) {
      this.addFunction(name, extension[name as keyof typeof extension]!);
    }
  }

  protected addFunction<F extends FunctionType>(
    name: F,
    fn: NonNullable<NostrNodeExtension[F]>,
  ): void {
    const set = this.functions[name] ?? (this.functions[name] = new Set());
    set.add(fn);
  }

  protected async exec<F extends FunctionType>(
    fn: F,
    context: Parameters<NostrNodeFunction<F>>[0],
  ): Promise<void> {
    const handlers = this.functions[fn];
    if (handlers) {
      await Promise.all(
        // @ts-ignore FIXME: TypeScript doesn't infer the type of `context` correctly
        [...handlers].map((handler) => handler(context)),
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

export type NostrNodeExtension<EventType extends string = string> = Partial<
  Record<EventType, NostrNodeFunction>
>;

// ------------------------------
// Functions
// ------------------------------

type NostrNodeFunctionSet<FunctionType extends string = string> = Partial<
  Record<FunctionType, Set<NostrNodeFunction>>
>;

type NostrNodeFunction<FunctionType extends string = string> = (
  context: FunctionContext<FunctionType>,
) => void;

interface FunctionContext<FunctionType extends string = string> {
  __type__: FunctionType;
}

// ------------------------------
// Events
// ------------------------------

type NostrNodeEventListenerOrEventListenerObject<
  EventType extends string = string,
> = NostrNodeEventListener<EventType> | NostrNodeEventListenerObject<EventType>;

type NostrNodeEvent<
  EventType extends string = string,
> = MessageEvent<FunctionContext<EventType>>;

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
