import { RelayUrl } from "@lophus/core/protocol";

export interface Config {
  columns: ColumnSpec[];
}

export type ColumnSpec = FeedSpec | RelayMonitorSpec;

export interface FeedSpec {
  name: string;
  class: "feed";
  source?: RelayUrl | RelayUrl[] | BuiltinSource;
}

export interface RelayMonitorSpec {
  name: string;
  class: "relay-monitor";
}

export type BuiltinSource = "@lophus/follows";
