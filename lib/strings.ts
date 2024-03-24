export type Stringified<T> = string & { _content: T };

export function parse<T>(stringified: Stringified<T>): T {
  return JSON.parse(stringified);
}

export function stringify<T>(content: T): Stringified<T> {
  return JSON.stringify(content) as Stringified<T>;
}
