import { NextRequest, NextResponse } from "next/server";
import { requireEventBySlug } from "@/lib/events";
import { LOGIN_SLIDES_SETTING_KEY, parseLoginSlides } from "@/lib/login-slides";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const event = await requireEventBySlug(slug);
    const setting = await prisma.appSetting.findUnique({
      where: { eventId_key: { eventId: event.id, key: LOGIN_SLIDES_SETTING_KEY } },
    });

    return NextResponse.json({ slides: parseLoginSlides(setting?.value) });
  } catch {
    return NextResponse.json({ slides: parseLoginSlides(null) });
  }
}
