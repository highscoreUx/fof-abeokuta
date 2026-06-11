"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

let socket: Socket | null = null;

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) {
      if (socket) {
        socket.disconnect();
        socket = null;
        socketRef.current = null;
      }
      return;
    }

    const url = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

    if (socket?.connected) {
      socket.auth = { token: accessToken };
      socket.disconnect().connect();
      socketRef.current = socket;
      return;
    }

    socket = io(url, {
      path: "/socket.io",
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    return () => {
      // Keep socket alive across navigations
    };
  }, [accessToken]);

  return socketRef.current;
}

export function getSocket() {
  return socket;
}
