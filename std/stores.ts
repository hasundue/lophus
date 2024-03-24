/**
 * A module that provides stores for Nostr events backed by IndexedDB.
 * @module
 */

import "@lophus/deno/idb";
import type { EventKind, NostrEvent } from "@lophus/core/protocol";

export class EventStore {
  #request: IDBOpenDBRequest;

  constructor(name: string, version?: number) {
    this.#request = self.indexedDB.open(name, version);

    this.#request.onupgradeneeded = () => {
      const db = this.#request.result;
      const events = db.createObjectStore("events", { keyPath: "id" });
      events.createIndex("kind", "kind");
    };
  }

  put<K extends EventKind>(event: NostrEvent<K>): Promise<void> {
  }
}
