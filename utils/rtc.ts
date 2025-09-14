import io from "socket.io-client";

// use your Render URL
export const socket = io("https://meeting-signal-server.onrender.com/", {
  transports: ["websocket"], // force websocket for stability
});
