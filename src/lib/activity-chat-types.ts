export type ActivityChatKind = "spinner" | "kahoot";

export interface ActivityChatBody {
  type: "activity";
  kind: ActivityChatKind;
  sessionId: string;
  instanceId: string;
  title: string;
  status: "live" | "ended";
  action: "started" | "spin_result" | "ended";
  text: string;
  metadata?: Record<string, unknown>;
}

export function serializeActivityChat(body: ActivityChatBody): string {
  return JSON.stringify(body);
}

export function parseActivityChatBody(body: string): ActivityChatBody | null {
  if (!body.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(body) as Partial<ActivityChatBody>;
    if (
      parsed.type !== "activity" ||
      (parsed.kind !== "spinner" && parsed.kind !== "kahoot") ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.instanceId !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.text !== "string"
    ) {
      return null;
    }
    return parsed as ActivityChatBody;
  } catch {
    return null;
  }
}
