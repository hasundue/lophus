//
// Utility types
//
export type Brand<K, T> = K & { __brand: T };

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
export type Require<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type Replace<T, K extends keyof T, V> = Omit<T, K> & { [P in K]: V };

//
// WebSocket
//
export type WebSocketEventType = Omit<WebSocketEventMap, "message">;

export type WebSocketEventListner = {
  [K in keyof WebSocketEventType]: (event: WebSocketEventMap[K]) => void;
};
