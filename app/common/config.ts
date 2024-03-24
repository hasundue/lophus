import type { EventFilter, RelayUrl } from "@lophus/nips/protocol";

export interface Config {
  feeds: FeedSpec[];
}

export interface FeedSpec {
  name: string;
  source: RelayUrl | RelayUrl[] | ScriptSource;
  filters?: EventFilter[];
}

export interface RelayMonitorSpec {
  name: string;
}

export type ScriptSource = "@lophus/follows";
