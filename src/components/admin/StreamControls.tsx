"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

export function StreamControls() {
  const { slug, api } = useEventApi();
  const socket = useSocket();
  const [videoId, setVideoId] = useState("");
  const [live, setLive] = useState(false);

  useEffect(() => {
    api<{ youtubeVideoId: string; streamLive: boolean }>("/settings").then((d) => {
      setVideoId(d.youtubeVideoId);
      setLive(d.streamLive);
    });
  }, [slug]);

  const save = async () => {
    await api("/settings", {
      method: "PATCH",
      body: JSON.stringify({ youtubeVideoId: videoId, streamLive: live }),
    });
    socket?.emit("stream:admin:toggle", { live, videoId });
  };

  return (
    <Card>
      <CardTitle>Stream Controls</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Stream via OBS to YouTube, then paste the video ID here.
      </p>
      <div className="mt-4 space-y-3">
        <Input value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="YouTube Video ID" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          Show LIVE badge
        </label>
        <Button onClick={save}>Save & Broadcast</Button>
      </div>
    </Card>
  );
}
