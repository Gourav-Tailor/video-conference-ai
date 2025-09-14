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
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // WebRTC + Socket logic
  useEffect(() => {
    const init = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // New user joined
      socket.on("user-joined", async (id: string) => {
        const pc = createPeerConnection(id, stream, setRemoteVideos);
        peers[id] = pc;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { to: id, offer });
      });

      // Incoming offer
      socket.on("offer", async ({ from, offer }) => {
        const pc = createPeerConnection(from, stream, setRemoteVideos);
        peers[from] = pc;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { to: from, answer });
      });

      // Incoming answer
      socket.on("answer", async ({ from, answer }) => {
        const pc = peers[from];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      // ICE candidates
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 relative">
      {/* Header */}
      <header className="p-4 border-b bg-white shadow-sm flex justify-between items-center">
        <h1 className="text-lg font-semibold">ConferX Meeting</h1>
        <p className="text-sm text-gray-500">Meeting ID: 123-456-789</p>
      </header>

      {/* Video grid */}
      <main className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-center">
        {/* Local video */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-64 h-48 bg-black rounded-lg shadow-md"
        />

        {/* Remote videos */}
        {Object.entries(remoteVideos).map(([id, stream]) => (
          <video
            key={id}
            autoPlay
            playsInline
            className="w-64 h-48 bg-black rounded-lg shadow-md"
            ref={(videoEl) => {
              if (videoEl) videoEl.srcObject = stream;
            }}
          />
        ))}
      </main>

      {/* Footer Controls */}
      <footer className="p-4 border-t bg-white flex items-center justify-center gap-4 sticky bottom-0 z-10 flex-wrap">
        <Button
          variant={micOn ? "default" : "destructive"}
          size="icon"
          className="rounded-full h-14 w-14 shadow-md"
          onClick={() => setMicOn(!micOn)}
        >
          {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>

        <Button
          variant={videoOn ? "default" : "destructive"}
          size="icon"
          className="rounded-full h-14 w-14 shadow-md"
          onClick={() => setVideoOn(!videoOn)}
        >
          {videoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </Button>

        <Button
          variant="secondary"
          size="icon"
          className="rounded-full h-14 w-14 shadow-md"
          onClick={() => setShowParticipants(true)}
        >
          <Users className="h-6 w-6" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          className="rounded-full h-14 w-14 shadow-md"
          onClick={() => setShowChat(true)}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>

        <Button
          variant="destructive"
          size="icon"
          className="rounded-full h-14 w-14 shadow-md"
          onClick={() => (window.location.href = "/")}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </footer>
    </div>
  );
}
