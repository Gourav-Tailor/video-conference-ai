// app/page.tsx (Home page with room code input)
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { VideoIcon } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-4">
      <Card className="w-full max-w-lg text-center shadow-2xl rounded-2xl border-none bg-white/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-4xl font-extrabold text-gray-900">
            ConferX
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Your seamless video conferencing solution
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Illustration */}
          <div className="flex justify-center">
            <div className="h-32 w-32 rounded-full bg-gradient-to-tr from-indigo-400 to-pink-400 flex items-center justify-center shadow-lg">
              <VideoIcon className="h-16 w-16 text-white" />
            </div>
          </div>

          {/* Room Code Input */}
          <Input
            placeholder="Enter room code (e.g., 1234)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="w-full rounded-xl text-lg"
          />

          {/* CTA Button */}
          <Button
            size="lg"
            className="w-full rounded-xl text-lg font-semibold shadow-md hover:shadow-lg transition bg-indigo-600 hover:bg-indigo-700"
            onClick={() => roomCode && router.push(`/meeting/${roomCode}`)}
            disabled={!roomCode}
          >
            Join Meeting
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}