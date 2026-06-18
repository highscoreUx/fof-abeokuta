import type { Socket } from "socket.io-client";

export function emitSocketAck(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 10000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(timeoutMs)
      .emit(event, payload, (err: Error | null, response?: { error?: string }) => {
        if (err || response?.error) {
          reject(new Error(response?.error ?? err?.message ?? "Request failed"));
          return;
        }
        resolve();
      });
  });
}
