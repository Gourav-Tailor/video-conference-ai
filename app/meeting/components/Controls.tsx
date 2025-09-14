"use client";
import { useState } from "react";

export default function Controls({ localStream }: { localStream: MediaStream | null }) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const toggleMic = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    setMicOn((prev) => !prev);
  };

  const toggleCam = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    setCamOn((prev) => !prev);
  };

  return (
    <div className="flex gap-4 mt-4">
      <button onClick={toggleMic} className="px-4 py-2 bg-gray-800 text-white rounded-lg">
        {micOn ? "Mute Mic" : "Unmute Mic"}
      </button>
      <button onClick={toggleCam} className="px-4 py-2 bg-gray-800 text-white rounded-lg">
        {camOn ? "Turn Off Cam" : "Turn On Cam"}
      </button>
    </div>
  );
}
