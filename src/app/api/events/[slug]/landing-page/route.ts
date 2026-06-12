import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { getEventBySlug } from "@/lib/events";
import { getEventLandingPage, saveEventLandingPage } from "@/lib/landing-page-server";
import { jsonError } from "@/lib/auth/middleware";
import { z } from "zod";

const saveSchema = z.object({
  projectData: z.record(z.string(), z.unknown()),
  html: z.string(),
  css: z.string(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }

  const landingPage = await getEventLandingPage(event.id);
  return NextResponse.json({
    landingPage,
    hasCustomPage: Boolean(landingPage),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "customize.branding");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  await saveEventLandingPage(ctx.event.id, parsed.data);
  return NextResponse.json({ ok: true });
}
