"use client";

import { useEffect, useRef, useState } from "react";
import { socket, peers, createPeerConnection } from "@/utils/rtc";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

export default function MeetingPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteVideos, setRemoteVideos] = useState<{ [id: string]: MediaStream }>({});
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

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

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
      localStream.getVideoTracks().forEach((t) => (t.enabled = videoOn));
    }
  }, [micOn, videoOn, localStream]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 relative">
      {/* Layout Container */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Local Video */}
        <div className="md:w-[75%] md:h-screen w-full h-[75%] relative overflow-hidden rounded-2xl shadow-2xl">
          {/* Local Video */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />

          {/* Footer Controls Overlay */}
          <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/70 backdrop-blur-md px-6 py-3 rounded-full flex items-center justify-center gap-6 shadow-lg">
            <Button
              variant={micOn ? "default" : "destructive"}
              size="icon"
              className="rounded-full h-14 w-14 transition-transform hover:scale-110"
              onClick={() => setMicOn(!micOn)}
            >
              {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>

            <Button
              variant={videoOn ? "default" : "destructive"}
              size="icon"
              className="rounded-full h-14 w-14 transition-transform hover:scale-110"
              onClick={() => setVideoOn(!videoOn)}
            >
              {videoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>

            <Button
              variant="destructive"
              size="icon"
              className="rounded-full h-14 w-14 transition-transform hover:scale-110"
              onClick={() => (window.location.href = "/")}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </footer>
        </div>
        {/* Remote Videos */}
        <div className="md:w-[25%] md:h-screen w-full h-[25%] bg-gray-900 overflow-y-auto md:overflow-y-scroll md:flex-col flex flex-row gap-3 p-3 rounded-lg shadow-inner">
          {Object.entries(remoteVideos).map(([id, stream]) => (
            <video
              key={id}
              autoPlay
              playsInline
              muted={false}
              className="rounded-xl shadow-md object-cover w-36 h-28 md:w-full md:h-40 transform scale-x-[-1] transition-all duration-300 hover:scale-105"
              ref={(videoEl) => {
                if (videoEl && stream) videoEl.srcObject = stream;
              }}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
