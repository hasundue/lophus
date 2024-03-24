/**
 * A collection of decorators for use in the Lophus project.
 * @module
 */

/**
 * A decorator that throws an error when a method is called.
 */
export function noImpl() {
  // deno-lint-ignore no-explicit-any
  return function (target: any, propertyKey: string, _descriptor: any) {
    new Proxy(target, {
      get(target, prop) {
        if (prop === propertyKey) {
          throw new Error(`${propertyKey} is not implemented`);
        }
        return Reflect.get(target, prop);
      },
    });
  };
}
