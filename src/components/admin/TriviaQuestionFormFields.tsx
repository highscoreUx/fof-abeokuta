"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TriviaQuestionType } from "@/lib/trivia/types";
import type { QuestionDraft } from "@/lib/quiz-question-form";

interface TriviaQuestionFormFieldsProps {
  questionType: TriviaQuestionType;
  draft: QuestionDraft;
  config: Record<string, unknown>;
  mediaUrl?: string | null;
  onDraftChange: (draft: QuestionDraft) => void;
  onConfigChange: (config: Record<string, unknown>) => void;
  onMediaPin?: (pin: { x: number; y: number }) => void;
}

export function TriviaQuestionFormFields({
  questionType,
  draft,
  config,
  mediaUrl,
  onDraftChange,
  onConfigChange,
  onMediaPin,
}: TriviaQuestionFormFieldsProps) {
  const updateOption = (index: number, value: string) => {
    const next = [...draft.options];
    next[index] = value;
    onDraftChange({ ...draft, options: next });
  };

  const addOption = () => {
    onDraftChange({ ...draft, options: [...draft.options, ""] });
  };

  const removeOption = (index: number, minOptions = 1) => {
    if (draft.options.length <= minOptions) return;
    const next = draft.options.filter((_, i) => i !== index);
    let correctIndex = draft.correctIndex;
    if (index < correctIndex) correctIndex -= 1;
    else if (index === correctIndex) correctIndex = Math.min(correctIndex, next.length - 1);
    correctIndex = Math.max(0, Math.min(correctIndex, next.length - 1));
    onDraftChange({ ...draft, options: next, correctIndex });
  };

  return (
    <div className="space-y-3">
      <Input
        value={draft.text}
        onChange={(e) => onDraftChange({ ...draft, text: e.target.value })}
        placeholder="Question text"
      />

      {(questionType === "QUIZ" || questionType === "QUIZ_AUDIO") && (
        <>
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
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeOption(i, 2)}
                  >
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
              onChange={(e) =>
                onDraftChange({ ...draft, correctIndex: Number(e.target.value) })
              }
            >
              {draft.options.map((opt, i) => (
                <option key={i} value={i}>
                  Option {i + 1}
                  {opt.trim() ? `: ${opt.trim()}` : ""}
                </option>
              ))}
            </Select>
          </div>
        </>
      )}

      {questionType === "TRUE_FALSE" && (
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Correct answer</label>
          <Select
            className="w-full"
            value={String(draft.correctIndex)}
            onChange={(e) =>
              onDraftChange({ ...draft, correctIndex: Number(e.target.value) })
            }
          >
            <option value={0}>True</option>
            <option value={1}>False</option>
          </Select>
        </div>
      )}

      {questionType === "TYPE_ANSWER" && (
        <>
          <p className="text-xs text-muted-foreground">
            Accepted answers (players typing any of these will be marked correct).
          </p>
          <div className="space-y-2">
            {draft.options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Accepted answer ${i + 1}`}
                  className="flex-1"
                />
                {draft.options.length > 1 && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => removeOption(i, 1)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addOption}>
            Add accepted answer
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(config.caseSensitive)}
              onChange={(e) => onConfigChange({ ...config, caseSensitive: e.target.checked })}
            />
            Case sensitive matching
          </label>
        </>
      )}

      {questionType === "PUZZLE" && (
        <>
          <p className="text-xs text-muted-foreground">
            Enter items in the correct order. Players will rearrange them during the game.
          </p>
          <div className="space-y-2">
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-sm text-muted-foreground">{i + 1}.</span>
                <Input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Item ${i + 1}`}
                  className="flex-1"
                />
                {draft.options.length > 2 && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => removeOption(i, 2)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addOption}>
            Add item
          </Button>
        </>
      )}

      {questionType === "SLIDER" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Min</label>
            <Input
              type="number"
              value={String(config.min ?? 0)}
              onChange={(e) => onConfigChange({ ...config, min: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Max</label>
            <Input
              type="number"
              value={String(config.max ?? 100)}
              onChange={(e) => onConfigChange({ ...config, max: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Correct value</label>
            <Input
              type="number"
              value={config.correct !== undefined ? String(config.correct) : ""}
              onChange={(e) => onConfigChange({ ...config, correct: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Tolerance (±)</label>
            <Input
              type="number"
              min={0}
              value={String(config.tolerance ?? 2)}
              onChange={(e) => onConfigChange({ ...config, tolerance: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {questionType === "PIN_ANSWER" && !mediaUrl && (
        <p className="text-sm text-muted-foreground">Upload an image above to set the correct pin.</p>
      )}

      {questionType === "PIN_ANSWER" && mediaUrl && (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Click the image to set the correct pin location.
          </p>
          <button
            type="button"
            className="relative w-full overflow-hidden rounded-xl border border-border"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pin = {
                x: (e.clientX - rect.left) / rect.width,
                y: (e.clientY - rect.top) / rect.height,
              };
              onConfigChange({ ...config, pins: [pin] });
              onMediaPin?.(pin);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl} alt="Pin target" className="w-full" />
            {Array.isArray(config.pins) &&
              (config.pins as Array<{ x: number; y: number }>).map((pin, i) => (
                <span
                  key={i}
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white"
                  style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                />
              ))}
          </button>
        </div>
      )}
    </div>
  );
}
