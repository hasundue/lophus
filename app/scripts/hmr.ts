/// <reference lib="dom" />

/**
 * Refresh the browser when the server sends a refresh event.
 * Ref: https://dev.to/craigmorten/how-to-code-live-browser-refresh-in-deno-309o
 * @module
 */

let socket: WebSocket, reconnectionTimerId: number;

/** Info message logger. */
function log(message: string) {
  console.info("[refresh] ", message);
}

/** Refresh the browser. */
function refresh() {
  window.location.reload();
}

/** Create WebSocket, connect to the server and listen for refresh events. */
function connect(callback = () => {}) {
  // Close any existing sockets.
  if (socket) {
    socket.close();
  }

  // Create a new WebSocket pointing to the server.
  socket = new WebSocket(
    `${window.location.origin.replace("http", "ws")}/refresh`,
  );

  // When the connection opens, execute the callback.
  socket.addEventListener("open", callback);

  // Add a listener for messages from the server.
  socket.addEventListener("message", (event) => {
    // Check whether we should refresh the browser.
    if (event.data === "refresh") {
      log("refreshing...");
      refresh();
    }
  });

  // Handle when the WebSocket closes. We log the loss of connection and set a timer to
  // start the connection again after a second.
  socket.addEventListener("close", () => {
    log("connection lost - reconnecting...");

    clearTimeout(reconnectionTimerId);

    reconnectionTimerId = setTimeout(() => {
      // Try to connect again, and if successful trigger a browser refresh.
      connect(refresh);
    }, 1000);
  });
}

// Kick off the connection code on load.
connect();
