import { assertEquals } from "@std/assert";
import { KvKeyFactory } from "./kv.ts";

Deno.test("KvKeyFactory", () => {
  const KvKey = KvKeyFactory("__indexedDB__");
  const TestKey = KvKey(["test"], (id: string) => [id]);
  assertEquals(TestKey.prefix, ["__indexedDB__", "test"]);
  assertEquals(
    TestKey("foo"),
    ["__indexedDB__", "test", "foo"],
  );
});
