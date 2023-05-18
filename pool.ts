import { Relay } from "./relay.ts";

export class RelayPool {
  private relays: Relay[];

  constructor(relays: RelayConfig[]) {
    this.relays = relays.map((config) => new Relay(config));
  }

  connect(relays: RelayConfig) {
    this.relays.push(new Relay(relay));
  }

  private async reconnect(relay: Relay) {
    await relay.reconnect();
    // Restart all subscriptions to the relay.
    if (relay.read) {
      this.subs.forEach((sub) => sub.restart(relay));
    }
  }

  subscribe(filter: Filter, options?: SubscribeOptions) {
    return new SubscriptionProvider(
      this.relays.filter((conn) => conn.read),
      { since: now(), ...filter },
      options,
    );
  }

  retrieve(filter: Filter, options?: SubscribeOptions) {
    const sub = new SubscriptionProvider(
      this.relays.filter((conn) => conn.read),
      filter,
      { close_on_eose: true, ...options },
    );
    return sub.stream;
  }

  async getLatest(filter: Filter): Promise<Event | null> {
    const sub = new SubscriptionProvider(
      this.relays.filter((conn) => conn.read),
      { limit: 1, ...filter },
      { close_on_eose: true },
    );
    for await (const event of sub.stream) {
      return event;
    }
    return null;
  }

  async publish(event: Event) {
    const env = Deno.env.get("RAILWAY_ENVIRONMENT");

    if (env !== "production") {
      console.log(`Skipped publishing (env: ${env}).`);
      return;
    }

    await Promise.all(
      this.relays.filter((conn) => conn.write).map(async (relay) => {
        if (!relay.connected) {
          console.assert(
            !relay.read,
            "Non write-only relay is left disconnected:",
            relay.url,
          );
          await this.reconnect(relay);
        }

        const sub = this.subscribe({ ids: [event.id] });
        const pub = relay.publish(event);

        pub.on("failed", (reason: string) => {
          console.error(
            `Failed to publish an event ${event.id} to ${relay.url}:`,
            { cause: reason },
          );
        });

        // Wait for the event to be published.
        for await (const event of sub.stream) {
          console.log(
            `Event ${event.id} has been published to ${relay.url}.`,
          );
          return;
        }
      }),
    );
  }

  close() {
    this.relays.forEach((relay) => {
      relay.close();
    });
  }
}
