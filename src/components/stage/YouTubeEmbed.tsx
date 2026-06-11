"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { Card } from "@/components/ui/card";

export function YouTubeEmbed() {
  const { slug, api } = useEventApi();
  const socket = useSocket();
  const [videoId, setVideoId] = useState("");
  const [live, setLive] = useState(false);

  useEffect(() => {
    api<{ youtubeVideoId: string; streamLive: boolean }>("/settings")
      .then((data) => {
        setVideoId(data.youtubeVideoId);
        setLive(data.streamLive);
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!socket) return;
    socket.on("stream:live", (data: { live: boolean; videoId?: string }) => {
      setLive(data.live);
      if (data.videoId) setVideoId(data.videoId);
    });
    return () => {
      socket.off("stream:live");
    };
  }, [socket]);

  if (!videoId) {
    return (
      <Card className="flex aspect-video items-center justify-center">
        <p className="text-muted-foreground">Stream will appear here when live</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      {live && (
        <div className="bg-primary px-4 py-1 text-center text-sm font-bold text-primary-foreground">
          LIVE
        </div>
      )}
      <div className="aspect-video">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}${live ? "?autoplay=1" : ""}`}
          title="Event Stream"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </Card>
  );
}
