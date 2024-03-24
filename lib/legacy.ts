/**
 * Create a DOMStringList from an iterable of strings.
 */
export function DOMStringList(iterable: Iterable<string>): DOMStringList {
  const array = Array.from(iterable);
  const obj = {
    item(index: number): string | null {
      return array[index] ?? null;
    },
    contains(value: string): boolean {
      return array.includes(value);
    },
    length: array.length,
  };
  array.forEach((value, index) => {
    Object.defineProperty(obj, index, { value, enumerable: true });
  });
  return obj as DOMStringList;
}
