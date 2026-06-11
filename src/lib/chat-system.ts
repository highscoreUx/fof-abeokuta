import type { ChatMessage } from "@/types/chat";

export const CHAT_SYSTEM_EVENT = "chat:system";

export type AgendaSystemAction = "created" | "updated" | "deleted" | "present" | "cleared";

export type ChatSystemKind = "agenda" | "check-in";

export interface ChatSystemBody {
  type: "system";
  kind: ChatSystemKind;
  action?: AgendaSystemAction;
  text: string;
}

export interface ChatSystemBroadcast extends ChatMessage {
  system: true;
  targetRoomId: string;
}

export function formatAgendaSystemText(
  action: AgendaSystemAction,
  title: string,
  timeRange?: string,
): string {
  switch (action) {
    case "created":
      return `New agenda item: ${title}${timeRange ? ` (${timeRange})` : ""}`;
    case "updated":
      return `Agenda updated: ${title}`;
    case "deleted":
      return `Agenda item removed: ${title}`;
    case "present":
      return `Now on stage: ${title}`;
    case "cleared":
      return "No agenda item is marked as present";
  }
}

export function createAgendaSystemMessage(
  action: AgendaSystemAction,
  title: string,
  timeRange?: string,
): ChatMessage {
  const text = formatAgendaSystemText(action, title, timeRange);
  return {
    id: `system-${crypto.randomUUID()}`,
    body: JSON.stringify({ type: "system", kind: "agenda", action, text } satisfies ChatSystemBody),
    createdAt: new Date().toISOString(),
    system: true,
    user: { username: "system", firstName: "Agenda", lastName: "Update" },
  };
}

export function formatCheckInSystemText(
  firstName: string,
  lastName: string,
  teamLetter?: string | null,
): string {
  const name = `${firstName} ${lastName}`.trim();
  if (teamLetter) {
    return `${name} (Team ${teamLetter}) checked in`;
  }
  return `${name} checked in`;
}

export function createCheckInSystemMessage(
  firstName: string,
  lastName: string,
  teamLetter?: string | null,
): ChatMessage {
  const text = formatCheckInSystemText(firstName, lastName, teamLetter);
  return {
    id: `system-${crypto.randomUUID()}`,
    body: JSON.stringify({ type: "system", kind: "check-in", text } satisfies ChatSystemBody),
    createdAt: new Date().toISOString(),
    system: true,
    user: { username: "system", firstName: "Check-in", lastName: "Update" },
  };
}

export function parseSystemBody(body: string): ChatSystemBody | null {
  if (!body.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(body) as Partial<ChatSystemBody>;
    if (parsed.type !== "system" || typeof parsed.text !== "string") return null;
    const kind: ChatSystemKind =
      parsed.kind === "check-in" ? "check-in" : parsed.kind === "agenda" ? "agenda" : "agenda";
    return {
      type: "system",
      kind,
      action: parsed.action,
      text: parsed.text,
    };
  } catch {
    return null;
  }
}

export function isSystemChatMessage(message: ChatMessage): boolean {
  return Boolean(message.system) || parseSystemBody(message.body) !== null;
}

export function systemMessageText(message: ChatMessage): string {
  return parseSystemBody(message.body)?.text ?? message.body;
}
