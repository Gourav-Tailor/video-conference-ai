"use client";
import { useEffect, useRef, useState } from "react";
import { socket, peers, createPeerConnection } from "@/utils/rtc";

export default function MeetingPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteVideos, setRemoteVideos] = useState<{ [id: string]: MediaStream }>({});

  useEffect(() => {
    const init = async () => {
      // Get local media (camera + mic)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Listen for other users joining
      socket.on("user-joined", async (id: string) => {
        const pc = createPeerConnection(id, stream, setRemoteVideos);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("offer", { to: id, offer });
      });

      // Listen for incoming offers
      socket.on("offer", async ({ from, offer }) => {
        const pc = createPeerConnection(from, stream, setRemoteVideos);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", { to: from, answer });
      });

      // Listen for answers
      socket.on("answer", async ({ from, answer }) => {
        const pc = peers[from];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      // Listen for ICE candidates
      socket.on("ice-candidate", async ({ from, candidate }) => {
        const pc = peers[from];
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });
    };

    init();

    return () => {
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-xl font-bold">Meeting Room</h1>

      {/* Local video */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="w-64 h-48 bg-black rounded-lg m-2"
      />

      {/* Remote videos */}
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(remoteVideos).map(([id, stream]) => (
          <video
            key={id}
            autoPlay
            playsInline
            className="w-64 h-48 bg-black rounded-lg m-2"
            ref={(videoEl) => {
              if (videoEl) videoEl.srcObject = stream;
            }}
          />
        ))}
      </div>
    </div>
  );
}
