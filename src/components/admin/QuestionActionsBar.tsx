"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { downloadQuizCsvTemplate } from "@/lib/quiz-csv-template";
import { cn } from "@/lib/cn";

interface QuestionActionsBarProps {
  onAddSingle: () => void;
  onAddBulk: () => void;
  onAddSpreadsheet: () => void;
  className?: string;
}

export function QuestionActionsBar({
  onAddSingle,
  onAddBulk,
  onAddSpreadsheet,
  className,
}: QuestionActionsBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button variant="secondary" onClick={() => downloadQuizCsvTemplate()}>
        Download bulk template
      </Button>
      <DropdownMenu
        align="end"
        trigger={
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary-hover"
          >
            Add question
            <span aria-hidden className="text-xs opacity-80">
              ▾
            </span>
          </button>
        }
      >
        <DropdownMenuItem onClick={onAddSingle}>Add single question</DropdownMenuItem>
        <DropdownMenuItem onClick={onAddBulk}>Add bulk questions</DropdownMenuItem>
        <DropdownMenuItem onClick={onAddSpreadsheet}>
          Add bulk questions from spreadsheet
        </DropdownMenuItem>
      </DropdownMenu>
    </div>
  );
}
