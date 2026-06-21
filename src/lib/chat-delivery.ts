export type ChatDeliveryStatus = "pending" | "sent" | "failed";

export function resolveOwnMessageDeliveryStatus(
  messageId: string,
  failedMessageIds: readonly string[],
): ChatDeliveryStatus {
  if (failedMessageIds.includes(messageId)) return "failed";
  if (messageId.startsWith("pending-")) return "pending";
  return "sent";
}
