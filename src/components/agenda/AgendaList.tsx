"use client";

import { AgendaAccentList } from "@/components/agenda/AgendaAccentList";
import { AgendaMinimalList } from "@/components/agenda/AgendaMinimalList";
import { AgendaNotebookList } from "@/components/agenda/AgendaNotebookList";
import { AgendaPosterList } from "@/components/agenda/AgendaPosterList";
import { AgendaTimelineList } from "@/components/agenda/AgendaTimelineList";
import type { AgendaListProps } from "@/components/agenda/types";
import { DEFAULT_AGENDA_TEMPLATE, type AgendaTemplateId } from "@/lib/agenda-templates";

interface AgendaListComponentProps extends AgendaListProps {
  template?: AgendaTemplateId;
}

export function AgendaList({
  template = DEFAULT_AGENDA_TEMPLATE,
  ...props
}: AgendaListComponentProps) {
  switch (template) {
    case "poster":
      return <AgendaPosterList {...props} />;
    case "timeline":
      return <AgendaTimelineList {...props} />;
    case "minimal":
      return <AgendaMinimalList {...props} />;
    case "accent":
      return <AgendaAccentList {...props} />;
    case "notebook":
    default:
      return <AgendaNotebookList {...props} />;
  }
}
