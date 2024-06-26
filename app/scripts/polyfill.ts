// https://bugs.chromium.org/p/chromium/issues/detail?id=929585#c10
if (typeof ReadableStream.prototype[Symbol.asyncIterator] !== "function") {
  Object.defineProperty(ReadableStream.prototype, Symbol.asyncIterator, {
    async *value() {
      const reader = this.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) return;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    },
    writable: true,
    enumerable: false,
    configurable: true,
  });
}
