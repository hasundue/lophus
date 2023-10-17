import type { NIP } from "./protocol.d.ts";
import { basename, join } from "../core/std/path.ts";
import { NostrNodeModule } from "./nodes.ts";

/**
 * Import a Nostr module from a URL.
 *
 * @param self - The path to the module to which the NIPs are attached (mostly import.meta.url).
 * @param root - The path to the root of NIP module to import.
 */
// deno-lint-ignore no-explicit-any
export function importNIPs<M extends NostrNodeModule<any>>(
  self: string,
  root: string,
) {
  return Promise.all(
    new URL(self).searchParams.get("nips")?.split(",").map(Number).map(
      (nip) =>
        import(
          new URL(
            join(root, nipToString(nip), basename(self)),
            import.meta.url,
          ).href
        ) as Promise<M>,
    ) ?? [],
  );
}

/**
 * Convert a NIP to a string. If the NIP is less than 10, a leading zero is
 * added.
 */
function nipToString(nip: NIP | number) {
  return nip > 9 ? nip.toString() : "0" + nip.toString();
}
