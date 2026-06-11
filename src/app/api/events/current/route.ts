import { NextResponse } from "next/server";
import { getCurrentEvent } from "@/lib/events";

export async function GET() {
  const event = await getCurrentEvent();
  if (!event) {
    return NextResponse.json({ error: "No live event" }, { status: 404 });
  }

  return NextResponse.json({
    event: { ...event, date: event.date.toISOString() },
  });
}
