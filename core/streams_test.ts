import {
  assert,
  assertEquals,
  beforeAll,
  describe,
  it,
} from "../lib/std/testing.ts";
import { NonExclusiveWritableStream } from "./streams.ts";

describe("NonExclusiveWritableStream", () => {
  let results: number[];
  let stream: NonExclusiveWritableStream<number>;
  let writer1: WritableStreamDefaultWriter<number>;
  let writer2: WritableStreamDefaultWriter<number>;

  beforeAll(() => {
    stream = new NonExclusiveWritableStream<number>({
      start() {
        results = [];
      },
      write(msg) {
        results.push(msg);
      },
      close() {
        results = [];
      },
      abort() {
        results = [];
      },
    });
  });

  it("should be constructable", () => {
    assert(stream instanceof NonExclusiveWritableStream);
  });

  it("should not be locked after construction", () => {
    assertEquals(stream.locked, false);
  });

  it("should call the start method on construction", () => {
    assertEquals(results, []);
  });

  it("should provide a writer", () => {
    writer1 = stream.getWriter();
    assert(writer1 instanceof WritableStreamDefaultWriter);
  });

  it("should not be locked after providing a writer", () => {
    assertEquals(stream.locked, false);
  });

  it("should write to the underlying sink", async () => {
    await writer1.write(1);
    assertEquals(results, [1]);
  });

  it("should provide multiple writers", async () => {
    writer2 = stream.getWriter();
    await writer2.write(2);
    assertEquals(results, [1, 2]);
  });

  it("should not be locked after providing multiple writers", () => {
    assertEquals(stream.locked, false);
  });

  it("should be writable from multiple writers simultaneously", async () => {
    await Promise.all([
      writer1.write(3),
      writer2.write(4),
    ]);
    assertEquals(results, [1, 2, 3, 4]);
  });

  it("should allow a writer to be closed", async () => {
    await writer2.close();
  });

  it("should be writable from the remaining writer", async () => {
    await writer1.write(5);
    assertEquals(results, [1, 2, 3, 4, 5]);
  });

  it("should be closable after all writers are closed", async () => {
    await writer1.close();
    await stream.close();
  });

  it("should call the close method on close", () => {
    assertEquals(results, []);
  });
});
