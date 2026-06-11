import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { requireEventRole } from "@/lib/auth/event-middleware";
import { quizQuestionSchema } from "@/lib/validators/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: quizId } = await params;
  const ctx = await requireEventRole(request, slug, "ADMIN");
  if (ctx instanceof NextResponse) return ctx;

  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, eventId: ctx.event.id } });
  if (!quiz) return jsonError("Quiz not found", "NOT_FOUND", 404);

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return jsonError("No file", "NO_FILE", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows: Record<string, string>[] = [];

    if (file.name.endsWith(".xlsx")) {
      const wb = XLSX.read(buffer, { type: "buffer" });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    } else {
      rows = Papa.parse<Record<string, string>>(buffer.toString(), { header: true }).data;
    }

    const questions = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const options = [row.option1, row.option2, row.option3, row.option4].filter(Boolean);
      const parsed = quizQuestionSchema.safeParse({
        text: row.text ?? row.question,
        options,
        correctIndex: parseInt(row.correctIndex ?? row.correct ?? "0", 10),
        timeLimitSec: parseInt(row.timeLimitSec ?? row.time ?? "20", 10),
      });
      if (!parsed.success) continue;

      const q = await prisma.quizQuestion.create({
        data: {
          quizId,
          text: parsed.data.text,
          options: parsed.data.options,
          correctIndex: parsed.data.correctIndex,
          timeLimitSec: parsed.data.timeLimitSec ?? 20,
          sortOrder: i,
        },
      });
      questions.push(q);
    }

    return NextResponse.json({ questions });
  }

  const body = await request.json();
  const parsed = quizQuestionSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);

  const count = await prisma.quizQuestion.count({ where: { quizId } });
  const question = await prisma.quizQuestion.create({
    data: {
      quizId,
      text: parsed.data.text,
      options: parsed.data.options,
      correctIndex: parsed.data.correctIndex,
      timeLimitSec: parsed.data.timeLimitSec ?? 20,
      sortOrder: count,
    },
  });

  return NextResponse.json({ question });
}
