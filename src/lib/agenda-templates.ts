export const AGENDA_TEMPLATE_IDS = [
  "notebook",
  "poster",
  "timeline",
  "minimal",
  "accent",
] as const;

export type AgendaTemplateId = (typeof AGENDA_TEMPLATE_IDS)[number];

export const DEFAULT_AGENDA_TEMPLATE: AgendaTemplateId = "notebook";

export function parseAgendaTemplate(value: unknown): AgendaTemplateId {
  if (typeof value === "string" && (AGENDA_TEMPLATE_IDS as readonly string[]).includes(value)) {
    return value as AgendaTemplateId;
  }
  return DEFAULT_AGENDA_TEMPLATE;
}

export interface AgendaTemplateMeta {
  id: AgendaTemplateId;
  name: string;
  description: string;
}

export const AGENDA_TEMPLATES: AgendaTemplateMeta[] = [
  {
    id: "notebook",
    name: "Notebook",
    description: "Spiral-bound tabs with colorful edges — the default look.",
  },
  {
    id: "poster",
    name: "Poster",
    description: "Bold sidebar and day header, great for event programs.",
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Vertical spine with numbered milestones along the way.",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple rows with light dividers — easy to scan.",
  },
  {
    id: "accent",
    name: "Accent stripes",
    description: "Colorful left bars on clean white cards.",
  },
];
