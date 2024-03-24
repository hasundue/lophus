/// <reference lib="dom" />

/**
 * Hydration script for feeds.
 * @module
 */

import type { PublicKey } from "@lophus/nips";
import "./polyfill.ts";
import { isInViewport } from "./common.ts";
import { hydrateTimestamp } from "./times.ts";

interface Params {
  pubkey: PublicKey;
}

export default async (feed: HTMLElement, { pubkey }: Params) => {
  const settings = feed.querySelector(".settings") as HTMLElement;
  //
  // Display inputs for sources based on the selected source type.
  //
  const source = settings.querySelector(
    "fieldset#source",
  ) as HTMLFieldSetElement;
  source.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.name !== "type") {
      return;
    }
    const value = input.getAttribute("value");
    const selected = source.querySelector(`fieldset#${value}`) as HTMLElement;
    selected.style.setProperty("display", "grid");
    selected.querySelectorAll("input,select").forEach((it) => {
      (it as HTMLInputElement | HTMLSelectElement).required = true;
    });
    const unselected = source.querySelectorAll(
      `fieldset:not(#${value})`,
    ) as NodeListOf<HTMLElement>;
    unselected.forEach((elem) => {
      elem.style.setProperty("display", "none");
      elem.querySelectorAll("input,select").forEach((it) => {
        (it as HTMLInputElement | HTMLSelectElement).required = false;
      });
    });
  });
  const index = feed.getAttribute("id")!;
  //
  // Create or update the feed and reload the page on submit.
  //
  const form = settings.querySelector("form") as HTMLFormElement;
  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    if (!this.checkValidity()) {
      return;
    }
    const data = new FormData(this);
    const sourceType = data.get("type") as "relays" | "script";
    const source = sourceType === "relays"
      ? Array.from(data.getAll("relay"))
      : data.get("script");
    await fetch(`/app/users/${pubkey}/feeds/${index}`, {
      method: "PUT",
      body: JSON.stringify({
        name: data.get("name"),
        source,
      }),
    });
    self.location.reload();
  });
  //
  // Removal of the feed
  //
  feed.querySelector("#remove")?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    await fetch(`/app/users/${pubkey}/feeds/${index}`, {
      method: "DELETE",
    });
    self.location.reload();
  });
  //
  // Feed contents
  //
  if (feed.style.display === "none") {
    return;
  }
  // Load the initial contents
  const contents = feed.querySelector(".contents") as HTMLElement;
  // Hide the contents until we load as many notes as needed to fill the viewport
  contents.style.setProperty("visibility", "hidden");
  // TODO: Calculate the theoretical maximum number of notes to load
  const { body } = await fetch(`/app/users/${pubkey}/feeds/${index}?limit=20`);
  // Pre-renderred notes
  const notes = body!.pipeThrough(new TextDecoderStream());
  for await (const note of notes) {
    contents.insertAdjacentHTML("beforeend", note);
    const elem = contents.lastElementChild as HTMLElement;
    // Make the timestamp updated dynamically
    hydrateTimestamp(elem);
    // Continue loading notes if the last note is in the viewport
    if (isInViewport(elem)) {
      continue;
    }
    // Stop loading notes when the first note out of the viewport is loaded
    contents.style.removeProperty("visibility");
    break;
  }
};
