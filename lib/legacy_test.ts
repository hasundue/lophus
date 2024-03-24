import { assertEquals } from "@std/assert";
import { DOMStringList } from "./legacy.ts";

Deno.test("DOMStringList", () => {
  const list = DOMStringList(["a", "b", "c"]);

  assertEquals(list.length, 3);

  assertEquals(list.item(0), "a");
  assertEquals(list.item(1), "b");
  assertEquals(list.item(2), "c");
  assertEquals(list.item(3), null);

  assertEquals(list.contains("a"), true);
  assertEquals(list.contains("b"), true);
  assertEquals(list.contains("c"), true);
  assertEquals(list.contains("d"), false);

  assertEquals(list[0], "a");
  assertEquals(list[1], "b");
  assertEquals(list[2], "c");
  assertEquals(list[3], undefined);
});
