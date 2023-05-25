import { assertEquals, beforeAll, describe, it } from "../lib/std/testing.ts";
import { collect } from "../lib/x/streamtools.ts";
import { broadcast, createDualMarkReadableStream } from "./streams.ts";

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

describe("ImpatientReadableStream", () => {
  let stops = 0;
  let restarts = 0;

  beforeAll(async () => {
    const stream = createDualMarkReadableStream<number>({
      start: (controller) => {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.enqueue(3);
        controller.close();
      },
      stop: () => {
        stops++;
      },
      restart: () => {
        restarts++;
      },
    }, { high: 2, low: 1 });

    await collect(stream);
  });

  it("should stop after a certain number of messages", () => {
    assertEquals(stops, 1);
  });

  it("should restart after a certain number of messages", () => {
    assertEquals(restarts, 1);
  });
});
