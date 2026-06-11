import type { Server as SocketIOServer } from "socket.io";

/** Shared across Next.js route bundles and the custom server entry. */
const globalIo = globalThis as typeof globalThis & { __fofSocketIo?: SocketIOServer };

function ioRef(): SocketIOServer | null {
  return globalIo.__fofSocketIo ?? null;
}

export function setIO(server: SocketIOServer) {
  globalIo.__fofSocketIo = server;
}

export function getIO(): SocketIOServer {
  const io = ioRef();
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

export function tryGetIO(): SocketIOServer | null {
  return ioRef();
}

export function getClientCount(): number {
  return ioRef()?.engine.clientsCount ?? 0;
}
