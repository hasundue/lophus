import type { NIP } from "./protocol.d.ts";
import { NostrNodeModule } from "./nodes.ts";

export const NIPs = {
  /**
   * Import a Nostr module from a URL.
   *
   * @param meta - The path to the module to which the NIPs are attached (mostly import.meta.url).
   * @param root - The path to the root of NIP module to import.
   */
  // deno-lint-ignore no-explicit-any
  import<M extends NostrNodeModule<any>>(
    meta: string,
    root: string,
  ) {
    const url = new URL(meta);
    const base = url.pathname.split("/").slice(-1)[0];
    return Promise.all(
      url.searchParams.get("nips")?.split(",").map(Number).map(
        (nip) =>
          import(
            new URL(
              `${root}/${nipToString(nip)}/${base}`,
              import.meta.url,
            ).href
          ) as Promise<M>,
      ) ?? [],
    );
  },
};

/**
 * Convert a NIP to a string. If the NIP is less than 10, a leading zero is
 * added.
 */
function nipToString(nip: NIP | number) {
  return nip > 9 ? nip.toString() : "0" + nip.toString();
}
