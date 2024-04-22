/**
 * A module that provides stores for Nostr events backed by IndexedDB.
 * @module
 */

import type { IDBFactory } from "@lophus/deno/idb";
import type { EventKind, NostrEvent } from "@lophus/core/protocol";

let indexedDB: IDBFactory;

if (self.indexedDB === undefined && Deno.Kv) {
  const { createIDBFactory } = await import("@lophus/deno/idb");
  indexedDB = createIDBFactory(
    await Deno.openKv(),
  );
} else {
  // Use improved types from @lophus/deno/idb
  indexedDB = self.indexedDB as unknown as IDBFactory;
}

export class EventStore {
  constructor(name: string, version?: number) {
    const request = indexedDB.open(name, version);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const events = db.createObjectStore("events", { keyPath: "id" });
      events.createIndex("kind", "kind");
    };
  }

  put<K extends EventKind>(_event: NostrEvent<K>) {
    // TODO: Implement
  }
}
