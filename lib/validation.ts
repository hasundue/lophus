import {
  EphemeralEventKind,
  EventKind,
  ParameterizedReplaceableEventKind,
  RegularEventKind,
  ReplaceableEventKind,
} from "../nips/01.ts";

declare module "../nips/01.ts" {
  namespace EventKind {
    export function isRegularEventKind(
      kind: EventKind,
    ): kind is RegularEventKind;
    export function isReplaceableEventKind(
      kind: EventKind,
    ): kind is ReplaceableEventKind;
    export function isEphemeralEventKind(
      kind: EventKind,
    ): kind is EphemeralEventKind;
    export function isParameterizedReplaceableEventKind(
      kind: EventKind,
    ): kind is ParameterizedReplaceableEventKind;
  }
}

EventKind.isRegularEventKind = function (
  kind: EventKind,
): kind is RegularEventKind {
  return 1000 <= kind && kind < 10000;
};
EventKind.isReplaceableEventKind = (
  kind: EventKind,
): kind is ReplaceableEventKind => {
  return (10000 <= kind && kind < 20000) || kind === 0;
};

EventKind.isEphemeralEventKind = (
  kind: EventKind,
): kind is EphemeralEventKind => {
  return 20000 <= kind && kind < 30000;
};

EventKind.isParameterizedReplaceableEventKind = (
  kind: EventKind,
): kind is ParameterizedReplaceableEventKind => {
  return 30000 <= kind && kind < 40000;
};
