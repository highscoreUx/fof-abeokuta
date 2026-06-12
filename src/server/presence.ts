import type { Server as SocketIOServer } from "socket.io";
import { eventRoom } from "@/server/socket/rooms";

const socketsByUser = new Map<string, Set<string>>();
const usersByEvent = new Map<string, Set<string>>();

export function getOnlineUserIds(eventId: string): string[] {
  return [...(usersByEvent.get(eventId) ?? [])];
}

function addConnection(eventId: string, userId: string, socketId: string) {
  let sockets = socketsByUser.get(userId);
  if (!sockets) {
    sockets = new Set();
    socketsByUser.set(userId, sockets);
  }
  const wasOnline = sockets.size > 0;
  sockets.add(socketId);

  if (!wasOnline) {
    let eventUsers = usersByEvent.get(eventId);
    if (!eventUsers) {
      eventUsers = new Set();
      usersByEvent.set(eventId, eventUsers);
    }
    eventUsers.add(userId);
  }
}

function removeConnection(eventId: string, userId: string, socketId: string) {
  const sockets = socketsByUser.get(userId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size > 0) return;

  socketsByUser.delete(userId);
  const eventUsers = usersByEvent.get(eventId);
  eventUsers?.delete(userId);
  if (eventUsers?.size === 0) usersByEvent.delete(eventId);
}

export function presenceConnect(
  io: SocketIOServer,
  eventId: string,
  eventSlug: string,
  userId: string,
  socketId: string,
) {
  addConnection(eventId, userId, socketId);
  io.to(eventRoom(eventSlug)).emit("presence:update", {
    onlineUserIds: getOnlineUserIds(eventId),
  });
}

export function presenceDisconnect(
  io: SocketIOServer,
  eventId: string,
  eventSlug: string,
  userId: string,
  socketId: string,
) {
  removeConnection(eventId, userId, socketId);
  io.to(eventRoom(eventSlug)).emit("presence:update", {
    onlineUserIds: getOnlineUserIds(eventId),
  });
}

export function isUserOnline(userId: string): boolean {
  return (socketsByUser.get(userId)?.size ?? 0) > 0;
}
