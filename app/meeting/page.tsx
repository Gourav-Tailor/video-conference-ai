"use client";
import { useEffect, useRef, useState } from "react";
import { socket, peers, remoteStreams, createPeerConnection } from "@/utils/rtc";

export default function MeetingPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteVideos, setRemoteVideos] = useState<{ id: string; stream: MediaStream }[]>([]);

  useEffect(() => {
    let localStream: MediaStream;

    const init = async () => {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      socket.emit("join", "main-room");

      socket.on("user-joined", async (id) => {
        const pc = createPeerConnection(id, localStream, setRemoteVideos);
        peers[id] = pc;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { to: id, sdp: offer });
      });

      socket.on("offer", async ({ from, sdp }) => {
        const pc = createPeerConnection(from, localStream, setRemoteVideos);
        peers[from] = pc;

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { to: from, sdp: answer });
      });

      socket.on("answer", async ({ from, sdp }) => {
        await peers[from].setRemoteDescription(new RTCSessionDescription(sdp));
      });

      socket.on("ice-candidate", ({ from, candidate }) => {
        peers[from].addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on("user-left", (id) => {
        delete peers[id];
        delete remoteStreams[id];
        setRemoteVideos(Object.entries(remoteStreams).map(([id, stream]) => ({ id, stream })));
      });
    };

    init();

    return () => {
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-left");
    };
  }, []);

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-xl font-bold mb-4">Meeting Room</h1>
      <video ref={localVideoRef} autoPlay playsInline muted className="w-1/3 rounded-lg border" />
      <div className="grid grid-cols-2 gap-4 mt-4">
        {remoteVideos.map(({ id, stream }) => (
          <video
            key={id}
            autoPlay
            playsInline
            ref={(el) => {
              if (el) el.srcObject = stream;
            }}
            className="w-64 rounded-lg border"
          />
        ))}
      </div>
    </div>
  );
}
