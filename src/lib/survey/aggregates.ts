import type { SurveyQuestionType } from "@/lib/survey/types";
import { parseSurveyConfig } from "@/lib/survey/types";

interface QuestionRow {
  id: string;
  type: SurveyQuestionType;
  text: string;
  config: unknown;
}

interface AnswerRow {
  questionId: string;
  value: unknown;
}

export function aggregateSurveyResults(
  questions: QuestionRow[],
  answers: AnswerRow[],
) {
  const byQuestion = new Map<string, AnswerRow[]>();
  for (const answer of answers) {
    const list = byQuestion.get(answer.questionId) ?? [];
    list.push(answer);
    byQuestion.set(answer.questionId, list);
  }

  return questions.map((question) => {
    const rows = byQuestion.get(question.id) ?? [];
    const config = parseSurveyConfig(question.config);
    const base = { questionId: question.id, type: question.type, text: question.text };

    switch (question.type) {
      case "POLL": {
        const counts = (config.options ?? []).map(() => 0);
        for (const row of rows) {
          const v = row.value as { optionIndex?: number };
          if (typeof v.optionIndex === "number" && counts[v.optionIndex] !== undefined) {
            counts[v.optionIndex] += 1;
          }
        }
        return { ...base, total: rows.length, optionCounts: counts, options: config.options ?? [] };
      }
      case "WORD_CLOUD":
      case "BRAINSTORM":
      case "OPEN_ENDED": {
        const texts: string[] = [];
        for (const row of rows) {
          const v = row.value as { text?: string };
          if (v.text?.trim()) texts.push(v.text.trim());
        }
        const freq = new Map<string, number>();
        for (const t of texts) freq.set(t, (freq.get(t) ?? 0) + 1);
        return {
          ...base,
          total: texts.length,
          responses: texts,
          wordFreq: Object.fromEntries(
            [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50),
          ),
        };
      }
      case "SCALE":
      case "NPS": {
        const values: number[] = [];
        for (const row of rows) {
          const v = row.value as { value?: number };
          if (typeof v.value === "number") values.push(v.value);
        }
        const avg = values.length
          ? values.reduce((s, n) => s + n, 0) / values.length
          : 0;
        const distribution: Record<number, number> = {};
        for (const v of values) distribution[v] = (distribution[v] ?? 0) + 1;
        let nps: number | undefined;
        if (question.type === "NPS") {
          const promoters = values.filter((v) => v >= 9).length;
          const detractors = values.filter((v) => v <= 6).length;
          nps = values.length
            ? Math.round(((promoters - detractors) / values.length) * 100)
            : 0;
        }
        return { ...base, total: values.length, average: Math.round(avg * 10) / 10, distribution, nps };
      }
      case "DROP_PIN": {
        const pins: Array<{ x: number; y: number }> = [];
        for (const row of rows) {
          const v = row.value as { pins?: Array<{ x: number; y: number }> };
          if (Array.isArray(v.pins)) pins.push(...v.pins);
        }
        return { ...base, total: rows.length, pins };
      }
      default:
        return { ...base, total: rows.length };
    }
  });
}
