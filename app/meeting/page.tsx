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
  const [remoteVideos, setRemoteVideos] = useState<{ [id: string]: MediaStream }>(
    {}
  );
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

      socket.on("user-joined", async (id: string) => {
        const pc = createPeerConnection(id, stream, setRemoteVideos);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { to: id, offer });
      });

      socket.on("offer", async ({ from, offer }) => {
        const pc = createPeerConnection(from, stream, setRemoteVideos);
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

  // Toggle mic/video on local stream
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => (track.enabled = micOn));
      localStream.getVideoTracks().forEach((track) => (track.enabled = videoOn));
    }
  }, [micOn, videoOn, localStream]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 relative">
      {/* Header */}
      <header className="p-4 border-b bg-white shadow-sm flex justify-between items-center">
        <h1 className="text-lg font-semibold">ConferX Meeting</h1>
        <p className="text-sm text-gray-500">Meeting ID: 123-456-789</p>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4 flex-wrap justify-center">
        {/* Local Video */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-64 h-48 bg-black rounded-lg shadow-md"
        />

        {/* Remote Videos */}
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
      </div>

      {/* Mobile Overlays (Participants / Chat) */}
      {showParticipants && (
        <div className="md:hidden absolute inset-0 bg-black/50 z-20 flex">
          <div className="bg-white w-72 max-w-full h-full shadow-xl p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-700">Participants</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowParticipants(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ul className="space-y-2 overflow-y-auto">
              {[...Array(6)].map((_, i) => (
                <li
                  key={i}
                  className="p-2 rounded-lg bg-gray-50 border text-sm text-gray-700"
                >
                  User {i + 1}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showChat && (
        <div className="md:hidden absolute inset-0 bg-black/50 z-20 flex">
          <div className="bg-white w-full h-3/4 mt-auto shadow-xl flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-gray-700">Chat</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChat(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              <div className="p-2 bg-gray-100 rounded-lg">User1: Hello 👋</div>
              <div className="p-2 bg-indigo-100 rounded-lg self-end">
                You: Hi there!
              </div>
            </div>
            <div className="p-3 border-t flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button size="sm">Send</Button>
            </div>
          </div>
        </div>
      )}

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
