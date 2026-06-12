"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { QuestionDraft } from "@/lib/quiz-question-form";

interface QuestionFormFieldsProps {
  draft: QuestionDraft;
  onChange: (draft: QuestionDraft) => void;
  showTimeLimit?: boolean;
}

export function QuestionFormFields({
  draft,
  onChange,
  showTimeLimit = true,
}: QuestionFormFieldsProps) {
  const updateOption = (index: number, value: string) => {
    const next = [...draft.options];
    next[index] = value;
    onChange({ ...draft, options: next });
  };

  const addOption = () => {
    if (draft.options.length >= 6) return;
    onChange({ ...draft, options: [...draft.options, ""] });
  };

  const removeOption = (index: number) => {
    if (draft.options.length <= 2) return;
    const next = draft.options.filter((_, i) => i !== index);
    let correctIndex = draft.correctIndex;
    if (index < correctIndex) correctIndex -= 1;
    else if (index === correctIndex) correctIndex = Math.min(correctIndex, next.length - 1);
    correctIndex = Math.max(0, Math.min(correctIndex, next.length - 1));
    onChange({ ...draft, options: next, correctIndex });
  };

  return (
    <div className="space-y-3">
      <Input
        value={draft.text}
        onChange={(e) => onChange({ ...draft, text: e.target.value })}
        placeholder="Question text"
      />
      <div className="space-y-2">
        {draft.options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1"
            />
            {draft.options.length > 2 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => removeOption(i)}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
      {draft.options.length < 6 && (
        <Button type="button" variant="secondary" size="sm" onClick={addOption}>
          Add option
        </Button>
      )}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Correct answer</label>
        <Select
          className="w-full"
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
      {showTimeLimit && (
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
      )}
    </div>
  );
}
