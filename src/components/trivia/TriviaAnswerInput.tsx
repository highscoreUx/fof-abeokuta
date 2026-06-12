"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KAHOOT_OPTIONS } from "@/lib/kahoot-ui";
import { cn } from "@/lib/utils";
import type { TriviaAnswerPayload, TriviaQuestionConfig, TriviaQuestionType } from "@/types";

interface TriviaAnswerInputProps {
  type: TriviaQuestionType;
  text: string;
  options: string[];
  config: TriviaQuestionConfig;
  mediaUrl?: string | null;
  disabled?: boolean;
  onSubmit: (payload: TriviaAnswerPayload) => void;
}

export function TriviaAnswerInput({
  type,
  options,
  config,
  mediaUrl,
  disabled,
  onSubmit,
}: TriviaAnswerInputProps) {
  const [textAnswer, setTextAnswer] = useState("");
  const [sliderValue, setSliderValue] = useState(config.min ?? 0);
  const [puzzleOrder, setPuzzleOrder] = useState<number[]>(
    () => config.items?.map((_, i) => i) ?? options.map((_, i) => i),
  );
  const [pins, setPins] = useState<Array<{ x: number; y: number }>>([]);

  if (type === "QUIZ" || type === "TRUE_FALSE" || type === "QUIZ_AUDIO") {
    const opts = type === "TRUE_FALSE" ? ["True", "False"] : options;
    return (
      <div className="space-y-4">
        {type === "QUIZ_AUDIO" && mediaUrl && (
          <audio controls src={mediaUrl} className="w-full" />
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {opts.map((opt, index) => {
            const style = KAHOOT_OPTIONS[index % KAHOOT_OPTIONS.length];
            return (
              <button
                key={index}
                type="button"
                disabled={disabled}
                onClick={() => onSubmit({ answerIndex: index })}
                className={cn(
                  "flex min-h-[4rem] items-center gap-3 rounded-xl px-4 py-4 text-left font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-50",
                  style.bg,
                )}
              >
                <span className="text-xl">{style.shape}</span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (type === "QUIZ_IMAGE") {
    return (
      <div className="space-y-4">
        {mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="" className="max-h-48 w-full rounded-xl object-contain" />
        )}
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt, index) => {
            const style = KAHOOT_OPTIONS[index % KAHOOT_OPTIONS.length];
            return (
              <button
                key={index}
                type="button"
                disabled={disabled || !opt}
                onClick={() => onSubmit({ answerIndex: index })}
                className={cn(
                  "overflow-hidden rounded-xl border-4 border-transparent transition hover:brightness-110 disabled:opacity-50",
                  style.bg.replace("bg-", "border-"),
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={opt} alt={`Answer ${index + 1}`} className="aspect-video w-full object-cover" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (type === "TYPE_ANSWER") {
    return (
      <div className="space-y-3">
        <Input
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          placeholder="Type your answer"
          disabled={disabled}
        />
        <Button disabled={disabled || !textAnswer.trim()} onClick={() => onSubmit({ text: textAnswer })}>
          Submit answer
        </Button>
      </div>
    );
  }

  if (type === "SLIDER") {
    const min = config.min ?? 0;
    const max = config.max ?? 100;
    return (
      <div className="space-y-4">
        <input
          type="range"
          min={min}
          max={max}
          value={sliderValue}
          disabled={disabled}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-center text-2xl font-bold">{sliderValue}</p>
        <Button disabled={disabled} onClick={() => onSubmit({ value: sliderValue })}>
          Submit answer
        </Button>
      </div>
    );
  }

  if (type === "PUZZLE" || type === "PUZZLE_IMAGE") {
    const items = config.items ?? options;
    return (
      <div className="space-y-3">
        {type === "PUZZLE_IMAGE" && mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="" className="max-h-48 w-full rounded-xl object-contain" />
        )}
        {puzzleOrder.map((itemIndex, position) => (
          <div key={position} className="flex items-center gap-2 rounded-xl border border-border p-3">
            <span className="w-6 text-muted-foreground">{position + 1}.</span>
            {type === "PUZZLE_IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={items[itemIndex]}
                alt=""
                className="h-16 w-16 flex-1 rounded-lg object-cover"
              />
            ) : (
              <span className="flex-1 font-medium">{items[itemIndex]}</span>
            )}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={disabled || position === 0}
                onClick={() => {
                  const next = [...puzzleOrder];
                  [next[position - 1], next[position]] = [next[position], next[position - 1]];
                  setPuzzleOrder(next);
                }}
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={disabled || position === puzzleOrder.length - 1}
                onClick={() => {
                  const next = [...puzzleOrder];
                  [next[position], next[position + 1]] = [next[position + 1], next[position]];
                  setPuzzleOrder(next);
                }}
              >
                ↓
              </Button>
            </div>
          </div>
        ))}
        <Button disabled={disabled} onClick={() => onSubmit({ order: puzzleOrder })}>
          Submit order
        </Button>
      </div>
    );
  }

  if (type === "PIN_ANSWER") {
    return (
      <div className="space-y-3">
        {mediaUrl ? (
          <button
            type="button"
            disabled={disabled}
            className="relative w-full overflow-hidden rounded-xl border border-border"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              const next = [...pins, { x, y }];
              setPins(next);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl} alt="Pin target" className="w-full" />
            {pins.map((pin, i) => (
              <span
                key={i}
                className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white"
                style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              />
            ))}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">No image configured for this question.</p>
        )}
        <Button
          disabled={disabled || pins.length === 0}
          onClick={() => onSubmit({ pins })}
        >
          Submit pin{pins.length !== 1 ? "s" : ""}
        </Button>
      </div>
    );
  }

  return null;
}
