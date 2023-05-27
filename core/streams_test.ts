import {
  assert,
  assertEquals,
  beforeAll,
  describe,
  it,
} from "../lib/std/testing.ts";
import { broadcast, NonExclusiveWritableStream } from "./streams.ts";

describe("broadcast", () => {
  it("should broadcast messages to multiple targets", async () => {
    const source = new ReadableStream<number>({
      start: (controller) => {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.enqueue(3);
        controller.close();
      },
    });

    const results = [[], []] as number[][];

    const targets = [
      new WritableStream<number>({
        write: (msg) => {
          results[0].push(msg);
        },
      }),
      new WritableStream<number>({
        write: (msg) => {
          results[1].push(msg);
        },
      }),
    ];

    await broadcast(source, targets);

    assertEquals(results, [[1, 2, 3], [1, 2, 3]]);
  });
});

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

  it("should be closable while a writer is active", async () => {
    await stream.close();
  });

  it("should close all writers when closed", async () => {
    await writer1.closed;
    await writer2.closed;
  });

  it("should call the close method on close", () => {
    assertEquals(results, []);
  });
});
