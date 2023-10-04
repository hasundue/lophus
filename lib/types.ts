// ----------------------
// Records and maps
// ----------------------
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type Require<T, K extends keyof T> = Expand<
  & T
  & Required<Pick<T, K>>
>;

export type Optional<T, K extends keyof T> = Expand<
  & Omit<T, K>
  & Partial<Pick<T, K>>
>;
