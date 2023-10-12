/**
 * Constructor of branded types
 */

// ----------------------
// Branded types
// ----------------------
export type Brand<T, B> = T & { __brand: B };

// ----------------------
// Promises
// ----------------------
export type PromiseCallbacks<T> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

// ----------------------
// Strings
// ----------------------

export type Url = `https://${string}` | `http://${string}`;
export type Stringified<T> = string & { __content: T };

// deno-fmt-ignore
export type AlphabetLetter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g"
  | "h" | "i" | "j" | "k" | "l" | "m" | "n"
  | "o" | "p" | "q" | "r" | "s" | "t" | "u"
  | "v" | "w" | "x" | "y" | "z"
  | "A" | "B" | "C" | "D" | "E" | "F" | "G"
  | "H" | "I" | "J" | "K" | "L" | "M" | "N"
  | "O" | "P" | "Q" | "R" | "S" | "T" | "U"
  | "V" | "W" | "X" | "Y" | "Z";

// ----------------------
// Logger
// ----------------------
export interface Logger {
  debug?: (...args: unknown[]) => void;
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}
