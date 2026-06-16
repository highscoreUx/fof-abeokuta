import type { ActivityChatBody } from "@/lib/activity-chat-types";

/** Focus-mode URL for an official event activity announced in chat. */
export function officialActivityPlayHref(
  homePrefix: string,
  activity: ActivityChatBody,
  options?: { spectate?: boolean },
): string {
  const base = `${homePrefix}/home/play`;
  const params = new URLSearchParams();

  if (activity.kind === "kahoot") {
    params.set("trivia", activity.instanceId);
    if (options?.spectate) params.set("mode", "spectate");
  } else if (activity.kind === "tic_tac_toe") {
    params.set("ttt", activity.instanceId);
    params.set("match", activity.sessionId);
  } else if (activity.kind === "hangman") {
    params.set("hangman", activity.instanceId);
    params.set("match", activity.sessionId);
  } else if (activity.kind === "countdown") {
    params.set("countdown", activity.instanceId);
    params.set("session", activity.sessionId);
  } else {
    params.set("spinner", activity.instanceId);
    params.set("session", activity.sessionId);
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
