import { NextResponse } from "next/server";
import { getLatestEvent } from "@/lib/events";

export async function GET() {
  const event = await getLatestEvent();
  if (!event) {
    return NextResponse.json({ error: "No events" }, { status: 404 });
  }

  return NextResponse.json({
    event: { ...event, date: event.date.toISOString() },
  });
}
