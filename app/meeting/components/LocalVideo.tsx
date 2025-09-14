"use client";
import { RefObject } from "react";

export default function LocalVideo({ videoRef }: { videoRef: RefObject<HTMLVideoElement> }) {
  return <video ref={videoRef} autoPlay playsInline muted className="w-1/3 rounded-lg border" />;
}
