/// <reference lib="dom" />

// import { Signer } from "@lophus/nips/07";

async function loginWithExtention() {
  // deno-lint-ignore no-window
  if (!window.nostr) {
    alert("Nostr extension not installed");
    return;
  }
  const pubkey = await window.nostr.getPublicKey();
  console.log(`[lophus] public key: ${pubkey}`);

  const app = await fetch(`/users/${pubkey}/app`, {
    method: "GET",
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  }).then((res) => res.text());
  // Relace the current page with the app
  document.body.innerHTML = app;
}

document.getElementById("login-with-extension")!.addEventListener(
  "click",
  loginWithExtention,
);
