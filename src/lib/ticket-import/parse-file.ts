import Papa from "papaparse";
import * as XLSX from "xlsx";
import { parseTicketCsvRow, type TicketCsvRow } from "@/lib/ticket-import/parse-row";

export function parseTicketImportFile(buffer: Buffer, filename: string) {
  let rawRows: Record<string, string>[];

  if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
  } else {
    rawRows = Papa.parse<Record<string, string>>(buffer.toString("utf-8"), {
      header: true,
      skipEmptyLines: true,
    }).data;
  }

  const rows: TicketCsvRow[] = [];
  const rowNumbers: number[] = [];
  const skipped: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < rawRows.length; i++) {
    const parsed = parseTicketCsvRow(rawRows[i]);
    if (!parsed) {
      skipped.push({ row: i + 2, reason: "Missing ticket number or name" });
      continue;
    }
    rows.push(parsed);
    rowNumbers.push(i + 2);
  }

  return { rows, rowNumbers, skipped };
}
