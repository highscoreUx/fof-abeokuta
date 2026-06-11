import { NextRequest, NextResponse } from "next/server";
import { getPublicEventBySlug } from "@/lib/events";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    event: { ...event, date: event.date.toISOString() },
  });
}
