"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

let sharedSocket: Socket | null = null;

function bindSocketState(setSocket: (socket: Socket | null) => void, instance: Socket) {
  const sync = () => setSocket(instance.connected ? instance : instance);
  instance.on("connect", sync);
  instance.on("disconnect", sync);
  sync();
  return () => {
    instance.off("connect", sync);
    instance.off("disconnect", sync);
  };
}

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [socket, setSocket] = useState<Socket | null>(sharedSocket);

  useEffect(() => {
    if (!accessToken) {
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
      setSocket(null);
      return;
    }

    const url = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

    if (sharedSocket) {
      sharedSocket.auth = { token: accessToken };
      if (!sharedSocket.connected) {
        sharedSocket.connect();
      }
      return bindSocketState(setSocket, sharedSocket);
    }

    sharedSocket = io(url, {
      path: "/socket.io",
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    return bindSocketState(setSocket, sharedSocket);
  }, [accessToken]);

  return socket;
}

export function getSocket() {
  return sharedSocket;
}

export function isSocketConnected() {
  return Boolean(sharedSocket?.connected);
}
