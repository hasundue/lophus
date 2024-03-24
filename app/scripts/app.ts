/// <reference lib="dom" />

import type { PublicKey } from "@lophus/nips";
import { fetchHTML } from "./common.ts";
import hydrateFeed from "./feeds.ts";

// Clear any hash in the URL
self.location.hash = "";

//
// Appearance
//
function adjustBodyHeight() {
  document.body.style.height = self.innerHeight + "px";
}
self.addEventListener("resize", adjustBodyHeight);
adjustBodyHeight();

//
// Load settings from the Nostr extension
//
const pubkey = await new Promise<PublicKey | undefined>((resolve) =>
  self.addEventListener("load", () => {
    if (self.nostr) {
      resolve(self.nostr.getPublicKey());
    }
    resolve(undefined);
  }, { once: true })
);
if (!pubkey) {
  throw new Error("Nostr extension not installed or configured");
}

const relays = await self.nostr?.getRelays?.() ?? {};
if (Object.keys(relays).length) {
  fetch(`/app/users/${pubkey}/settings/relays`, {
    method: "POST",
    body: JSON.stringify(relays),
  });
}

//
// Menu properties and status
//
interface Modal {
  elems: HTMLElement[];
  displayed: boolean;
}
const modals = new Map<string, Modal>();

function isModal(elem: HTMLElement): boolean {
  const style = self.getComputedStyle(elem).getPropertyValue("display");
  return style === "none";
}

//
// Lazy-loading of contents
//
document.head.insertAdjacentHTML(
  "beforeend",
  await fetchHTML(`/app/users/${pubkey}/settings/style`),
);

// Header (menu bar)
document.body.insertAdjacentHTML(
  "afterbegin",
  await fetchHTML(`/app/users/${pubkey}/header`),
);

const main = document.querySelector("main")!;

// Feed containers
main.insertAdjacentHTML(
  "beforeend",
  await fetchHTML(`/app/users/${pubkey}/feeds`),
);

// Feed settings and contents
const feeds = main.querySelectorAll(".feed") as NodeListOf<HTMLElement>;
feeds.forEach((feed, index) => {
  // Hydrate the feed settings and contents asynchronously
  hydrateFeed(feed, { pubkey });

  const settings = feed.querySelector(".settings") as HTMLElement;
  // A hidden new feed
  if (feed.style.display === "none") {
    modals.set("new_feed", { elems: [feed, settings], displayed: false });
    return;
  }
  if (isModal(settings)) {
    modals.set(`${index}`, { elems: [settings], displayed: false });
  }
});

// Settings window
document.body.insertAdjacentHTML(
  "beforeend",
  await fetchHTML(`/app/users/${pubkey}/settings`),
);

//
// Menu UIs (settings, new note, etc.)
//
const settings = document.querySelector("body > .settings") as HTMLElement;
if (isModal(settings)) {
  modals.set("settings", { elems: [settings], displayed: false });
}

// The modal effect (blur the background, typically)
const effect = document.querySelector(".modal") as HTMLElement;

self.addEventListener("hashchange", () => {
  const hash = self.location.hash.slice(1);
  // Hide the modal when the hash is cleared
  if (!hash) {
    effect.style.setProperty("display", "none");
    return modals.forEach((modal) => {
      if (modal.displayed) {
        modal.elems.forEach((it) => it.style.setProperty("display", "none"));
        modal.displayed = false;
      }
    });
  }
  const modal = modals.get(hash);
  if (!modal) {
    return;
  }
  effect.style.setProperty("display", "block");
  modal.elems.forEach((it) => it.style.setProperty("display", "grid"));
  modal.displayed = true;
});

// Hide the modal by clicking outside of it
self.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (target.matches(".modal")) {
    self.location.hash = "";
  }
});
