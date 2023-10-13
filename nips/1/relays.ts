import {
  EventRejected,
  PublicationEvent,
  RelayExtensionModule,
  SubscriptionEvent,
} from "../../core/relays.ts";

export default {
  handleRelayToClientMessage({ message, relay }) {
    const type = message[0];
    relay.config.logger?.debug?.(relay.config.name, message);
    switch (type) {
      case "EVENT":
      case "EOSE": {
        const sid = message[1];
        return relay.dispatchEvent(
          new SubscriptionEvent(`${sid}:receive`, { data: message }),
        );
      }
      case "OK": {
        const eid = message[1];
        return relay.dispatchEvent(
          new PublicationEvent(`${eid}:response`, { data: message }),
        );
      }
      case "NOTICE": {
        const notice = message[1];
        return relay.config?.logger?.info?.(notice);
      }
    }
  },
  handleSubscriptionMessage({ message, options, controller }) {
    const type = message[0];
    switch (type) {
      case "EVENT": {
        const [, , event] = message;
        return controller.enqueue(event);
      }
      case "EOSE": {
        if (!options.realtime) {
          return controller.close();
        }
      }
    }
  },
  handlePublicationMessage({ message, event }) {
    const type = message[0];
    if (type !== "OK") {
      // This NIP only supports OK messages.
      return;
    }
    const accepted = message[2];
    if (accepted) {
      return;
    }
    const reason = message[3];
    throw new EventRejected(reason, { cause: event });
  },
  handlePublish({ event, relay }) {
    const writer = relay.getWriter();
    writer.ready.then(() => writer.write(["EVENT", event]));
  },
} satisfies RelayExtensionModule["default"];
