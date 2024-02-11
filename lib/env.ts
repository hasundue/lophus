import "https://deno.land/std@0.215.0/dotenv/load.ts";
import type { PrivateKey, PublicKey } from "../mod.ts";

class Env {
  #nsec?: PrivateKey;
  #pubkey?: PublicKey;

  get PRIVATE_KEY() {
    if (!this.#nsec) {
      const value = Deno.env.get("PRIVATE_KEY");
      if (!value) {
        throw new Error("PRIVATE_KEY is not set");
      }
      this.#nsec = value as PrivateKey;
    }
    return this.#nsec;
  }

  get PUBLIC_KEY() {
    if (!this.#pubkey) {
      const value = Deno.env.get("PUBLIC_KEY");
      if (!value) {
        throw new Error("PUBLIC_KEY is not set");
      }
      this.#pubkey = value as PublicKey;
    }
    return this.#pubkey;
  }
}

export const env = new Env();
