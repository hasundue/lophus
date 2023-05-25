import { push } from "./x/streamtools.ts";

export type BroadcastPromise<T> = keyof Pick<
  typeof Promise<T>,
  "all" | "race" | "any"
>;

export function broadcast<T = unknown>(
  source: ReadableStream<T>,
  targets: WritableStream<T>[],
  promise: BroadcastPromise<T> = "all",
) {
  return source.pipeTo(
    new WritableStream({
      write: (msg) => {
        // deno-lint-ignore no-explicit-any
        return (Promise[promise] as any)(
          targets.map((target) => push(target, msg)),
        );
      },
    }),
  );
}
