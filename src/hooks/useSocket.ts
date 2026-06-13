"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

let sharedSocket: Socket | null = null;
let sharedAuthKey: string | null = null;

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

function disconnectSharedSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
  sharedAuthKey = null;
}

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const eventSlug = useAuthStore((s) => s.user?.eventSlug ?? null);
  const [socket, setSocket] = useState<Socket | null>(sharedSocket);

  useEffect(() => {
    if (!accessToken || !eventSlug) {
      disconnectSharedSocket();
      setSocket(null);
      return;
    }

    const authKey = `${eventSlug}:${accessToken}`;
    const url = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const auth = { token: accessToken, eventSlug };

    if (sharedSocket && sharedAuthKey === authKey) {
      return bindSocketState(setSocket, sharedSocket);
    }

    disconnectSharedSocket();

    sharedAuthKey = authKey;
    sharedSocket = io(url, {
      path: "/socket.io",
      auth,
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    return bindSocketState(setSocket, sharedSocket);
  }, [accessToken, eventSlug]);

  return socket;
}

export function getSocket() {
  return sharedSocket;
}

export function isSocketConnected() {
  return Boolean(sharedSocket?.connected);
}
