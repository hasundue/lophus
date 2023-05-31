import {
  assert,
  assertEquals,
  beforeAll,
  describe,
  it,
} from "../lib/std/testing.ts";
import {
  NonExclusiveReadableStream,
  NonExclusiveWritableStream,
} from "./streams.ts";

describe("NonExclusiveReadableStream", () => {
  let stream: NonExclusiveReadableStream<number>;
  let reader1: ReadableStreamDefaultReader<number>;
  let reader2: ReadableStreamDefaultReader<number>;

  let started = false;

  beforeAll(() => {
    stream = new NonExclusiveReadableStream<number>({
      start(controller) {
        started = true;
        controller.enqueue(1);
        controller.enqueue(2);
        controller.close();
      },
    });
  });

  it("should be constructable", () => {
    assert(stream instanceof NonExclusiveReadableStream);
  });

  it("should not be locked after construction", () => {
    assertEquals(stream.locked, false);
  });

  it("should call the start method on construction", () => {
    assert(started);
  });

  it("should provide a reader", () => {
    reader1 = stream.getReader();
    assert(reader1 instanceof ReadableStreamDefaultReader);
  });

  it("should not be locked after providing a reader", () => {
    assertEquals(stream.locked, false);
  });

  it("should read from the underlying source", async () => {
    const { value, done } = await reader1.read();
    assertEquals(value, 1);
    assertEquals(done, false);
  });

  it("should provide multiple readers", async () => {
    reader2 = stream.getReader();
    const { value, done } = await reader2.read();
    assertEquals(value, 1);
    assertEquals(done, false);
  });

  it("should not be locked after providing multiple readers", () => {
    assertEquals(stream.locked, false);
  });

  it("should allow a reader to be canceled", () => {
    reader1.releaseLock();
  });

  it("should read from the underlying source after canceling a reader", async () => {
    const { value, done } = await reader2.read();
    assertEquals(value, 2);
    assertEquals(done, false);
  });

  it("should be able to be piped to a writable stream", async () => {
    const results: number[] = [];
    const writable = new WritableStream<number>({
      write(chunk) {
        results.push(chunk);
      },
    });
    await stream.pipeTo(writable);
    assertEquals(results, [1, 2]);
  });

  it("should be readable after piping to a writable stream", async () => {
    const { value, done } = await reader2.read();
    assertEquals(value, undefined);
    assertEquals(done, true);
  });

  it("should be able to piped through a transform stream", async () => {
    const results: number[] = [];
    const transform = new TransformStream<number, number>({
      transform(chunk, controller) {
        controller.enqueue(chunk * 2);
      },
    });
    await stream.pipeThrough(transform).pipeTo(
      new WritableStream<number>({
        write(chunk) {
          results.push(chunk);
        },
      }),
    );
    assertEquals(results, [2, 4]);
  });

  it("should be teeable", () => {
    const [tee1, tee2] = stream.tee();
    assert(tee1 instanceof NonExclusiveReadableStream);
    assert(tee2 instanceof NonExclusiveReadableStream);
  });

  it("should be iterable", async () => {
    const results: number[] = [];
    for await (const chunk of stream) {
      results.push(chunk);
    }
    assertEquals(results, [1, 2]);
  });

  it("should be cancelable", async () => {
    await stream.cancel();
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

  it("should be closable after all writers are closed", async () => {
    await writer1.close();
    await stream.close();
  });

  it("should call the close method on close", () => {
    assertEquals(results, []);
  });
});
