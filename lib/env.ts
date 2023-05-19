import "https://deno.land/std@0.187.0/dotenv/load.ts";
import { PrivateKey, PublicKey } from "../nips/01.ts";

class Env {
  #nsec?: PrivateKey;
  #pubkey?: PublicKey;

  get PRIVATE_KEY() {
    if (this.#nsec) {
      return this.#nsec;
    }
    const value = Deno.env.get("PRIVATE_KEY");
    if (!value) {
      throw new Error("PRIVATE_KEY is not set");
    }
    if (!this.#nsec) {
      this.#nsec = value as PrivateKey;
    }
    return value as PrivateKey;
  }

  get PUBLIC_KEY() {
    if (this.#pubkey) {
      return this.#pubkey;
    }
    const value = Deno.env.get("PUBLIC_KEY");
    if (!value) {
      throw new Error("PUBLIC_KEY is not set");
    }
    if (!this.#pubkey) {
      this.#pubkey = value as PublicKey;
    }
    return value as PublicKey;
  }
}

export const env = new Env();
