export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  userId?: string;
  teamId?: string;
  recipientId?: string;
  staffChannel?: boolean;
  system?: boolean;
  user: { username: string; firstName: string; lastName: string };
}

export type ChatRoomCategory = "general" | "team" | "private" | "staff";

export interface ChatRoom {
  id: string;
  category: ChatRoomCategory;
  label: string;
  letter?: string;
  name?: string;
}

export interface ChatParticipant {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  teamLetter: string | null;
  roleName: string;
  online?: boolean;
}
