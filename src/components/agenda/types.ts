export interface AgendaListItem {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
}

export interface AgendaEventMeta {
  title: string;
  date: string;
}

export interface AgendaListProps {
  items: AgendaListItem[];
  className?: string;
  emptyMessage?: string;
  onDelete?: (id: string) => void;
  event?: AgendaEventMeta;
}
