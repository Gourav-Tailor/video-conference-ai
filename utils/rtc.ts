import io from "socket.io-client";

export const socket = io("http://localhost:4000");

export const peers: { [id: string]: RTCPeerConnection } = {};
export const remoteStreams: { [id: string]: MediaStream } = {};

export const createPeerConnection = (
  id: string,
  localStream: MediaStream,
  setRemoteVideos: (videos: { id: string; stream: MediaStream }[]) => void
) => {
  const pc = new RTCPeerConnection();

  // Add local tracks
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  // Handle ICE
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", { to: id, candidate: event.candidate });
    }
  };

  // Handle remote tracks
  pc.ontrack = (event) => {
    remoteStreams[id] = event.streams[0];
    setRemoteVideos(Object.entries(remoteStreams).map(([id, stream]) => ({ id, stream })));
  };

  return pc;
};
