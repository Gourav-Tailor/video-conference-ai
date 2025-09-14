// utils/rtc.ts
import { io } from "socket.io-client";

// ✅ Replace this with your deployed signaling server URL
export const socket = io("https://your-signal-server.com", {
  transports: ["websocket"],
});

// Store peer connections
export const peers: { [id: string]: RTCPeerConnection } = {};

// Store remote streams
export const remoteStreams: { [id: string]: MediaStream } = {};

/**
 * Create a new RTCPeerConnection for a peer
 * @param peerId - The ID of the peer
 * @param localStream - Your own camera/mic stream
 * @param setRemoteVideos - React setState hook to update remote video list
 */
export function createPeerConnection(
  peerId: string,
  localStream?: MediaStream,
  setRemoteVideos?: React.Dispatch<React.SetStateAction<{ [id: string]: MediaStream }>>
) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }, // free STUN server
    ],
  });

  // ✅ Add local tracks (camera + mic)
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
  }

  // ✅ Handle remote tracks
  pc.ontrack = (event) => {
    if (!remoteStreams[peerId]) {
      remoteStreams[peerId] = new MediaStream();
    }
    event.streams[0].getTracks().forEach((track) => {
      remoteStreams[peerId].addTrack(track);
    });

    // Update React state
    if (setRemoteVideos) {
      setRemoteVideos((prev) => ({
        ...prev,
        [peerId]: remoteStreams[peerId],
      }));
    }
  };

  // ✅ Send ICE candidates to signaling server
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
