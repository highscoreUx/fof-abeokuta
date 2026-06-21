export interface ChatGameCancellationMeta {
  cancelledByUserId: string;
  winnerUserId: string | null;
}

const CANCELLATION_KEY = "cancellation";

export function parseChatGameCancellation(raw: unknown): ChatGameCancellationMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const nested = value[CANCELLATION_KEY];
  if (!nested || typeof nested !== "object") return null;
  const cancellation = nested as Partial<ChatGameCancellationMeta>;
  if (typeof cancellation.cancelledByUserId !== "string") return null;
  return {
    cancelledByUserId: cancellation.cancelledByUserId,
    winnerUserId:
      typeof cancellation.winnerUserId === "string" ? cancellation.winnerUserId : null,
  };
}

export function mergeChatGameCancellation(
  settings: unknown,
  cancellation: ChatGameCancellationMeta,
): Record<string, unknown> {
  const base =
    settings && typeof settings === "object" ? { ...(settings as Record<string, unknown>) } : {};
  return {
    ...base,
    [CANCELLATION_KEY]: cancellation,
  };
}
