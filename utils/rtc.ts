// utils/rtc.ts
import { io } from "socket.io-client";

export const socket = io("https://your-signal-server.com"); 
// replace with your deployed signaling server

// Store peers
export const peers: { [id: string]: RTCPeerConnection } = {};

// Store remote streams
export const remoteStreams: { [id: string]: MediaStream } = {};

export function createPeerConnection(peerId: string) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
    ],
  });

  // Handle remote stream
  pc.ontrack = (event) => {
    if (!remoteStreams[peerId]) {
      remoteStreams[peerId] = new MediaStream();
    }
    event.streams[0].getTracks().forEach((track) => {
      remoteStreams[peerId].addTrack(track);
    });
  };

  // Send ICE candidates to signaling server
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        to: peerId,
        candidate: event.candidate,
      });
    }
  };

  peers[peerId] = pc;
  return pc;
}
