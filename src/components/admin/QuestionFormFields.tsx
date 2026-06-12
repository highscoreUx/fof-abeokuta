"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { QuestionDraft } from "@/lib/quiz-question-form";

interface QuestionFormFieldsProps {
  draft: QuestionDraft;
  onChange: (draft: QuestionDraft) => void;
}

export function QuestionFormFields({ draft, onChange }: QuestionFormFieldsProps) {
  return (
    <div className="space-y-3">
      <Input
        value={draft.text}
        onChange={(e) => onChange({ ...draft, text: e.target.value })}
        placeholder="Question text"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {draft.options.map((opt, i) => (
          <Input
            key={i}
            value={opt}
            onChange={(e) => {
              const next = [...draft.options];
              next[i] = e.target.value;
              onChange({ ...draft, options: next });
            }}
            placeholder={`Option ${i + 1}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Correct answer</label>
          <Select
            value={String(draft.correctIndex)}
            onChange={(e) => onChange({ ...draft, correctIndex: Number(e.target.value) })}
          >
            {draft.options.map((opt, i) => (
              <option key={i} value={i}>
                Option {i + 1}
                {opt.trim() ? `: ${opt.trim()}` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Time limit (sec)</label>
          <Input
            type="number"
            min={5}
            max={120}
            value={draft.timeLimitSec}
            onChange={(e) => onChange({ ...draft, timeLimitSec: Number(e.target.value) })}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
}
