import {
  assert,
  assertEquals,
  assertObjectMatch,
  assertThrows,
} from "@std/assert";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "@std/testing/bdd";
import type {
  IDBDatabase,
  IDBIndex,
  IDBObjectStore,
  IDBOpenDBRequest,
  IDBTransaction,
} from "./idb/mod.ts";
import "./idb/mod.ts";

function ensure(target: EventTarget, event: string): Promise<Event> {
  return new Promise((resolve) => {
    target.addEventListener(event, resolve, { once: true });
  });
}

describe("IDBOpenRequest", () => {
  describe("onupgradeneeded", () => {
    let name: string;
    let request: IDBOpenDBRequest;

    beforeEach(() => {
      name = crypto.randomUUID();
      request = self.indexedDB.open(name);
    });

    afterEach(() => {
      self.indexedDB.deleteDatabase(name);
    });

    it("should be called when the database is created", async () => {
      await new Promise<void>((resolve) => {
        request.onupgradeneeded = (event) => {
          assertObjectMatch(event, {
            oldVersion: 0,
            newVersion: 1,
          });
          assertEquals(event.target.result.name, name);
          resolve();
        };
      });
    });

    it("should provide createObjectStore method", async () => {
      await new Promise<void>((resolve) => {
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          const store = db.createObjectStore("events", { keyPath: "id" });
          assertEquals(store.name, "events");
          resolve();
        };
      });
    });
  });

  describe("onsuccess", () => {
    const name = crypto.randomUUID();

    afterAll(async () => {
      using kv = await Deno.openKv();
      await kv.delete(["databases", name]);
    });

    it("should be called when the database is opened", async () => {
      const request = self.indexedDB.open(name);
      await ensure(request, "success");
      assertEquals(request.result.name, name);
    });
  });
});

describe("IDBDatabase", () => {
  const name = crypto.randomUUID();
  let db: IDBDatabase;

  beforeAll(async () => {
    const request = self.indexedDB.open(name);
    await new Promise((resolve) => {
      request.onupgradeneeded = (event) =>
        resolve(
          event.target.result.createObjectStore("events", { keyPath: "id" }),
        );
    });
    await ensure(request, "success");
    db = request.result;
  });

  afterAll(async () => {
    using kv = await Deno.openKv();
    await kv.delete(["databases", name]);
  });

  it("should have a name", () => {
    assertEquals(db.name, name);
  });

  it("should have a version", () => {
    assertEquals(db.version, 1);
  });

  describe("objectStoreNames", () => {
    it("should return a list of object store names", () => {
      assertEquals(db.objectStoreNames.length, 1);
      assertEquals(db.objectStoreNames[0], "events");
    });
  });

  describe("transaction", () => {
    it("should return a transaction", () => {
      const transaction = db.transaction("events");
      assertEquals(transaction.db, db);
    });
  });
});

describe('IDBObjectStore<"readonly">', () => {
  const name = crypto.randomUUID();
  let db: IDBDatabase;
  let store: IDBObjectStore<"readonly">;

  beforeAll(async () => {
    const request = self.indexedDB.open(name);
    await new Promise((resolve) => {
      request.onupgradeneeded = (event) =>
        resolve(
          event.target.result.createObjectStore("events", { keyPath: "id" }),
        );
    });
    await ensure(request, "success");
    db = request.result;
    store = db.transaction("events").objectStore("events");
  });

  afterAll(async () => {
    using kv = await Deno.openKv();
    await kv.delete(["databases", name]);
  });

  it("should have a name", () => {
    assertEquals(store.name, "events");
  });

  it("should have the keyPath property", () => {
    assertEquals(store.keyPath, "id");
  });

  it("should have the autoIncrement property", () => {
    assertEquals(store.autoIncrement, false);
  });

  it("should have a transaction", () => {
    assertEquals(store.transaction.db, db);
  });

  describe("add", () => {
    it("should throw InvalidStateError", () => {
      assertThrows(() =>
        // @ts-expect-error add is not available in a readonly transaction
        store.add({ id: 1, pubkey: "pubkey" })
      );
    });
  });

  describe("createIndex", () => {
    it("should throw InvalidStateError", () => {
      assertThrows(() =>
        // @ts-expect-error createIndex is not available in a normal transaction
        store.createIndex("pubkey", "pubkey")
      );
    });
  });
});

describe('IDBObjectStore<"versionchange">', () => {
  const name = crypto.randomUUID();
  let store: IDBObjectStore<"versionchange">;

  beforeAll(async () => {
    const request = self.indexedDB.open(name);
    await new Promise<void>((resolve) => {
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        store = db.createObjectStore("events", { keyPath: "id" });
        resolve();
      };
    });
    await ensure(request, "success");
  });

  afterAll(async () => {
    const request = self.indexedDB.deleteDatabase(name);
    await ensure(request, "success");
  });

  describe("add", () => {
    it("should add an object", async () => {
      const object = { id: 1, pubkey: "pubkey" };
      const request = store.add(object);
      await ensure(request, "success");
      assertEquals(request.result, 1);
    });

    it("should throw DataError when the value does not include the key path", () => {
      assertThrows(() => store.add({ pubkey: "" }));
    });
  });

  describe("createIndex", () => {
    it("should create an index", () => {
      const index = store.createIndex("pubkey", "pubkey");
      assertEquals(index.name, "pubkey");
    });

    it("should create an index with options", () => {
      const index = store.createIndex("pubkey", "pubkey", { unique: true });
      assertEquals(index.name, "pubkey");
      assertEquals(index.unique, true);
    });
  });
});

describe("IDBTransaction", () => {
  const name = crypto.randomUUID();
  let db: IDBDatabase;
  let transaction: IDBTransaction;

  beforeAll(async () => {
    const request = self.indexedDB.open(name);
    await new Promise((resolve) => {
      request.onupgradeneeded = (event) =>
        resolve(
          event.target.result.createObjectStore("events", { keyPath: "id" }),
        );
    });
    await ensure(request, "success");
    db = request.result;
  });

  afterAll(async () => {
    const request = self.indexedDB.deleteDatabase(name);
    await ensure(request, "success");
  });

  beforeEach(() => {
    transaction = db.transaction("events");
  });

  it("should have the `db` property", () => {
    assertEquals(transaction.db, db);
  });

  it("should have the `mode` property", () => {
    assertEquals(transaction.mode, "readonly");
  });

  it("should have the `objectStoreNames` property", () => {
    assertEquals(transaction.objectStoreNames.length, 1);
    assertEquals(transaction.objectStoreNames[0], "events");
  });

  it("should have the `objectStore` method", () => {
    const store = transaction.objectStore("events");
    assertEquals(store.name, "events");
  });

  describe("oncomplete", () => {
    it("should be called when the transaction is completed", async () => {
      const promise = new Promise((resolve) => {
        transaction.oncomplete = resolve;
      });
      transaction.dispatchEvent(new Event("complete"));
      assert(await promise);
    });
  });
});

describe("IDBIndex", () => {
  const name = crypto.randomUUID();
  let index: IDBIndex;

  beforeAll(async () => {
    const request = self.indexedDB.open(name);
    await new Promise<void>((resolve) => {
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const store = db.createObjectStore("events", { keyPath: "id" });
        index = store.createIndex("pubkey", "pubkey");
        resolve();
      };
    });
    await ensure(request, "success");
  });

  afterAll(async () => {
    using kv = await Deno.openKv();
    await kv.delete(["databases", name]);
  });

  it("should have a name", () => {
    assertEquals(index.name, "pubkey");
  });

  it("should have a keyPath", () => {
    assertEquals(index.keyPath, "pubkey");
  });

  it("should have a unique property", () => {
    assertEquals(index.unique, false);
  });
});
