import { Node, NodeOptions } from "@lophus/core/nodes";
import { NIP } from "./protocol.ts";

interface NodeConstructor {
  // deno-lint-ignore no-explicit-any
  new (init: any, options: NodeOptions): Node;
}

// @ts-ignore 2430 FIXME
interface WithNIPs<T extends Node, N extends NIP> extends T {
  config: T["config"] & { nips: N[] };
  readonly ready: Promise<void>;
}

interface NIPsEnabled<T extends typeof Node> {
  new <N extends NIP = NIP>(
    init: ConstructorParameters<T>[0],
    options?: ConstructorParameters<T>[1] & { nips?: N[] },
  ): WithNIPs<InstanceType<T>, N>;
}

export interface NIPModule<T extends NodeConstructor, N extends NIP = NIP> {
  (node: WithNIPs<InstanceType<T>, N>): void;
}

/** Convert a NIP to a string. If the NIP is less than 10, a leading zero is added. */
function nipToString(nip: NIP | number) {
  return nip > 9 ? nip.toString() : "0" + nip.toString();
}

export function NIPsEnabled<T extends NodeConstructor>(
  Node: T,
  base: NIPModule<T>,
  moduleBaseName: string,
  moduleNIPs: Readonly<NIP[]>,
): NIPsEnabled<T> {
  // @ts-ignore allow concrete arguments
  return class<N extends NIP = NIP> extends Node {
    declare config: InstanceType<T>["config"] & { nips: N[] };
    readonly ready: Promise<void>;

    constructor(
      readonly init: ConstructorParameters<T>[0],
      options: ConstructorParameters<T>[1] & { nips?: N[] } = {},
    ) {
      super(init, options);
      this.config.nips = options.nips ?? [];
      this.ready = Promise.all(
        this.config.nips.filter((nip) => moduleNIPs.includes(nip)).map(
          async (nip) => {
            const mod = await import(
              `./${nipToString(nip)}/${moduleBaseName}`
            ) as { default: NIPModule<T, N> };
            mod.default(this);
          },
        ),
      ).then();
      base(this);
    }

    override async dispatch(
      type: Parameters<InstanceType<T>["dispatch"]>[0],
      data: Parameters<InstanceType<T>["dispatch"]>[1],
    ): Promise<void> {
      await this.ready;
      super.dispatch(type, data);
    }
  };
}
