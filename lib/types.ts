//
// Branded types
//
export type Brand<K, T> = K & { __brand: T };

//
// Records and maps
//
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type Require<T, K extends keyof T> = Expand<
  & T
  & Required<Pick<T, K>>
>;

export type Optional<T, K extends keyof T> = Expand<
  & Omit<T, K>
  & Partial<Pick<T, K>>
>;

export type Replace<T, K extends keyof T, V> = Expand<
  & Omit<T, K>
  & { [P in K]: V }
>;

export type Determined<T, K extends keyof T, V extends T[K]> = Expand<
  & Omit<T, K>
  & { [P in K]?: V }
>;

export type Overload<T, K extends keyof T, V> = Expand<
  & Optional<T, K>
  & Partial<V>
>;

//
// Streams API
//
export type ReadableWritableStream<R = unknown, W = unknown> =
  & ReadableStream<R>
  & WritableStream<W>;

//
// WebSocket
//
export type WebSocketEventListner = {
  [K in keyof WebSocketEventMap]: (event: WebSocketEventMap[K]) => void;
};
