export interface Timestamp {
  value: number;
  unit: string;
}

export function hydrateTimestamp(note: HTMLElement, initial?: Timestamp) {
  const date = note.querySelector(".date") as HTMLElement;
  let current = initial ?? parse(date.innerHTML);
  const interval = setInterval(() => {
    const updated = increment(current);
    date.innerHTML = stringify(updated);
    if (updated.unit !== current.unit) {
      clearInterval(interval);
      hydrateTimestamp(note, updated);
    }
    current = updated;
  }, toDelay(current.unit));
}

function parse(timestamp: string): Timestamp {
  return {
    value: parseInt(timestamp.slice(0, -1)),
    unit: timestamp.slice(-1),
  };
}

function stringify(timestamp: Timestamp): string {
  return `${timestamp.value}${timestamp.unit}`;
}

function increment(timestamp: Timestamp): Timestamp {
  const next = new Map([
    ["s", "m"],
    ["m", "h"],
    ["h", "d"],
    ["d", "d"],
  ]);
  return timestamp.value < 60
    ? {
      value: timestamp.value + 1,
      unit: timestamp.unit,
    }
    : {
      value: 1,
      unit: next.get(timestamp.unit) ??
        error(`Invalid unit: ${timestamp.unit}`),
    };
}

function toDelay(unit: string) {
  return new Map([
    ["s", 1000],
    ["m", 60 * 1000],
    ["h", 60 * 60 * 1000],
    ["d", 24 * 60 * 60 * 1000],
  ]).get(unit) ?? error(`Invalid unit: ${unit}`);
}

function error(message: string): never {
  throw new Error(message);
}
