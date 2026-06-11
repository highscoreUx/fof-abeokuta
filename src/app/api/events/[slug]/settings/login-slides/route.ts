import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { LOGIN_SLIDES_SETTING_KEY, parseLoginSlides } from "@/lib/login-slides";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "customize.branding");
  if (ctx instanceof NextResponse) return ctx;

  const setting = await prisma.appSetting.findUnique({
    where: { eventId_key: { eventId: ctx.event.id, key: LOGIN_SLIDES_SETTING_KEY } },
  });

  const slides = parseLoginSlides(setting?.value);
  const custom = Boolean(setting?.value);

  return NextResponse.json({ slides, custom });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "customize.branding");
  if (ctx instanceof NextResponse) return ctx;

  const form = await request.formData();
  const indexRaw = form.get("index");
  const file = form.get("file");

  if (typeof indexRaw !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "index and file are required" }, { status: 400 });
  }

  const index = Number(indexRaw);
  if (!Number.isInteger(index) || index < 0 || index > 2) {
    return NextResponse.json({ error: "index must be 0, 1, or 2" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WebP images are allowed" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const uploadDir = path.join(process.cwd(), "public", "uploads", "events", slug);
  await mkdir(uploadDir, { recursive: true });

  const filename = `slide-${index}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const setting = await prisma.appSetting.findUnique({
    where: { eventId_key: { eventId: ctx.event.id, key: LOGIN_SLIDES_SETTING_KEY } },
  });
  const slides = [...parseLoginSlides(setting?.value)];
  slides[index] = `/uploads/events/${slug}/${filename}`;

  await prisma.appSetting.upsert({
    where: { eventId_key: { eventId: ctx.event.id, key: LOGIN_SLIDES_SETTING_KEY } },
    create: { eventId: ctx.event.id, key: LOGIN_SLIDES_SETTING_KEY, value: JSON.stringify(slides) },
    update: { value: JSON.stringify(slides) },
  });

  return NextResponse.json({ slides });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "customize.branding");
  if (ctx instanceof NextResponse) return ctx;

  await prisma.appSetting.deleteMany({
    where: { eventId: ctx.event.id, key: LOGIN_SLIDES_SETTING_KEY },
  });

  return NextResponse.json({ slides: parseLoginSlides(null), custom: false });
}
