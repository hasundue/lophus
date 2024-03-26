/// <reference lib="dom" />

if (window.location.hostname === "localhost") {
  import(new URL("/dist/hmr.bundle.js", window.location.origin).href);
}

const feeds = Array.from(document.getElementsByClassName("feed"));

feeds.forEach((feed) => {
  const query = new URLSearchParams({ q: feed.getAttribute("query")! })
    .toString();
  const source = new EventSource(`/api/events${query}`);

  const container = feed.querySelector(".feed-container")!;
  source.addEventListener("message", (e: MessageEvent<string>) => {
    container.insertAdjacentHTML("afterbegin", e.data);
  });
});
