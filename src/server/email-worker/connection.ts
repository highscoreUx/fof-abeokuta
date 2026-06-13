import type { Channel } from "amqplib";
import amqp from "amqplib";
import { EMAIL_QUEUE_NAME, getCloudAmqpUrl } from "@/server/email-worker/config";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

let connection: AmqpConnection | null = null;
let channel: Channel | null = null;
let connecting: Promise<Channel> | null = null;

async function connectChannel(): Promise<Channel> {
  const conn = await amqp.connect(getCloudAmqpUrl());
  const ch = await conn.createChannel();
  await ch.assertQueue(EMAIL_QUEUE_NAME, { durable: true });

  conn.on("error", (error) => {
    console.error("[queue] connection error:", error);
  });
  conn.on("close", () => {
    connection = null;
    channel = null;
    connecting = null;
  });

  connection = conn;
  channel = ch;
  return ch;
}

export async function getQueueChannel(): Promise<Channel> {
  if (channel) return channel;
  if (!connecting) {
    connecting = connectChannel().finally(() => {
      connecting = null;
    });
  }
  return connecting;
}

export async function closeQueueConnection(): Promise<void> {
  try {
    await channel?.close();
  } catch {
    // ignore
  }
  try {
    await connection?.close();
  } catch {
    // ignore
  }
  channel = null;
  connection = null;
  connecting = null;
}
