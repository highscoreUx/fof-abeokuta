export interface AgendaColor {
  main: string;
  light: string;
}

export const AGENDA_COLORS: AgendaColor[] = [
  { main: "#E5A319", light: "#FDF6E8" },
  { main: "#D4622A", light: "#FDEEE6" },
  { main: "#7CB518", light: "#F1F8E8" },
  { main: "#2D9CDB", light: "#E8F5FC" },
  { main: "#D63384", light: "#FCE8F3" },
  { main: "#6F42C1", light: "#F0E8FC" },
  { main: "#20C997", light: "#E6FAF4" },
  { main: "#FD7E14", light: "#FFF0E6" },
];

export function agendaColorForItem(id: string, index: number): AgendaColor {
  const hash = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AGENDA_COLORS[(hash + index) % AGENDA_COLORS.length];
}
