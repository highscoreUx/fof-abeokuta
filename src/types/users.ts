import type { Role } from "@/types";

export interface EventUserRow {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: Role;
  teamLetter: string | null;
  teamId: string | null;
  loginPhrase?: string | null;
  password?: string;
  checkedInAt: string | null;
  createdAt: string;
}
