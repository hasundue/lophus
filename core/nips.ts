export type NIP = 1 | 2 | 42;

export class NIPs {
  static readonly registered: Set<NIP> = new Set();

  static register(nip: NIP) {
    this.registered.add(nip);
  }
}
