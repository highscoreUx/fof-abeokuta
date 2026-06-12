export interface QuestionDraft {
  text: string;
  options: string[];
  correctIndex: number;
  timeLimitSec: number;
}

export function emptyQuestionDraft(): QuestionDraft {
  return {
    text: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    timeLimitSec: 20,
  };
}

export function validateQuestionDraft(draft: QuestionDraft): string | null {
  const trimmedOptions = draft.options.map((o) => o.trim()).filter(Boolean);
  if (!draft.text.trim()) return "Question text is required.";
  if (trimmedOptions.length < 2) return "Add at least two answer options.";
  if (draft.correctIndex >= trimmedOptions.length) {
    return "Correct answer must match one of the options.";
  }
  return null;
}

export function questionDraftToPayload(draft: QuestionDraft) {
  const options = draft.options.map((o) => o.trim()).filter(Boolean);
  return {
    text: draft.text.trim(),
    options,
    correctIndex: draft.correctIndex,
    timeLimitSec: draft.timeLimitSec,
  };
}
