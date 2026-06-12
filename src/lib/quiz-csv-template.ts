/** CSV columns accepted by the questions import endpoint. */
export const QUIZ_CSV_HEADERS = [
  "question",
  "option1",
  "option2",
  "option3",
  "option4",
  "correctIndex",
  "timeLimitSec",
] as const;

const EXAMPLE_ROWS = [
  [
    "What is Figma primarily used for?",
    "Design",
    "Code",
    "Email",
    "Spreadsheets",
    "0",
    "20",
  ],
  [
    "Which team letter comes first in FIGMA?",
    "F",
    "I",
    "G",
    "M",
    "0",
    "15",
  ],
];

export function buildQuizCsvTemplate(): string {
  const header = QUIZ_CSV_HEADERS.join(",");
  const rows = EXAMPLE_ROWS.map((cells) =>
    cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
  );
  return [header, ...rows].join("\n");
}

export function downloadQuizCsvTemplate(filename = "live-trivia-questions-template.csv") {
  const blob = new Blob([buildQuizCsvTemplate()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
