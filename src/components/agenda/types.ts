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
  presentItemId?: string | null;
  onEdit?: (item: AgendaListItem) => void;
  onDelete?: (id: string) => void;
  onSetPresent?: (item: AgendaListItem) => void;
  onClearPresent?: (item: AgendaListItem) => void;
  event?: AgendaEventMeta;
}
