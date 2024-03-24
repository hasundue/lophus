import { NostrEvent, PublicKey } from "@lophus/core/protocol";
import { RelayLike } from "@lophus/core/relays";

export interface HtmlHandler {
  (
    props: Record<string, string | undefined>,
    specifier?: string,
  ):
    | string
    | Promise<string>
    | ReadableStream<Uint8Array>
    | Promise<ReadableStream<Uint8Array>>;
}

export interface FeederProps {
  id?: string;
  limit?: number;
  me: PublicKey;
  source: RelayLike;
}

export interface Feeder {
  (
    props: FeederProps,
  ): ReadableStream<NostrEvent> | Promise<ReadableStream<NostrEvent>>;
}

export interface FeederModule {
  default: Feeder;
}
