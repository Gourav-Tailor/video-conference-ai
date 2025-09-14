"use client";

import { useEffect, useRef, useState } from "react";
import { socket, peers, createPeerConnection } from "@/utils/rtc";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  MessageSquare,
  X,
} from "lucide-react";

export default function MeetingPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteVideos, setRemoteVideos] = useState<{ [id: string]: MediaStream }>({});
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  // WebRTC + Socket logic
  useEffect(() => {
    const init = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      socket.on("user-joined", async (id: string) => {
        const pc = createPeerConnection(id, stream, setRemoteVideos);
        peers[id] = pc;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { to: id, offer });
      });

      socket.on("offer", async ({ from, offer }) => {
        const pc = createPeerConnection(from, stream, setRemoteVideos);
        peers[from] = pc;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { to: from, answer });
      });

      socket.on("answer", async ({ from, answer }) => {
        const pc = peers[from];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on("ice-candidate", async ({ from, candidate }) => {
        const pc = peers[from];
        if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
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

  // Toggle mic/video
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
      localStream.getVideoTracks().forEach((t) => (t.enabled = videoOn));
    }
  }, [micOn, videoOn, localStream]);

  // Calculate total participants
  const allVideos = [{ id: "local", stream: localStream }, ...Object.entries(remoteVideos).map(([id, stream]) => ({ id, stream }))];

  // Determine grid rows and columns dynamically
  const total = allVideos.length;
  const cols = total <= 1 ? 1 : total <= 4 ? 2 : 3;

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 relative">
      {/* Video Grid */}
      <main
        className={`flex-1 grid gap-2 p-2`}
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridAutoRows: `minmax(200px, 1fr)`,
        }}
      >
        {allVideos.map(({ id, stream }) => (
          <video
            key={id}
            autoPlay
            playsInline
            muted={id === "local"}
            className={`w-full h-full object-cover rounded-md shadow-lg ${
              id === "local" ? "transform scale-x-[-1]" : ""
            }`}
            ref={(videoEl) => {
              if (videoEl && stream) videoEl.srcObject = stream;
            }}
          />
        ))}
      </main>

      {/* Footer Controls */}
      <footer className="p-4 bg-gray-800 flex items-center justify-center gap-4 sticky bottom-0 z-10 flex-wrap">
        <Button
          variant={micOn ? "default" : "destructive"}
          size="icon"
          className="rounded-full h-14 w-14"
          onClick={() => setMicOn(!micOn)}
        >
          {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>

        <Button
          variant={videoOn ? "default" : "destructive"}
          size="icon"
          className="rounded-full h-14 w-14"
          onClick={() => setVideoOn(!videoOn)}
        >
          {videoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </Button>

        <Button
          variant="secondary"
          size="icon"
          className="rounded-full h-14 w-14"
          onClick={() => (window.location.href = "/")}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </footer>
    </div>
  );
}
