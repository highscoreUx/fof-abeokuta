import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.event.findMany({
    where: { status: { in: ["LIVE", "DRAFT", "ARCHIVED"] } },
    orderBy: { date: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      date: true,
      status: true,
    },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      ...e,
      date: e.date.toISOString(),
    })),
  });
}
