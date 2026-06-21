/**
 * When the server has reached a terminal state, always render that snapshot
 * instead of a pending optimistic overlay (useOptimistic "wins" until passthrough
 * updates — this makes terminal server truth win immediately).
 */
export function preferServerTerminalSnapshot<T>(
  server: T | null,
  optimistic: T | null,
  isTerminal: (value: T) => boolean,
): T | null {
  if (server && isTerminal(server)) return server;
  return optimistic;
}
