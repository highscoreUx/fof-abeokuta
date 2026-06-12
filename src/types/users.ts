export interface EventUserRow {
  id: string;
  email: string | null;
  maskedEmail?: string | null;
  needsEmail?: boolean;
  firstName: string;
  lastName: string;
  username: string;
  permissionProfile: string;
  teamLetter: string | null;
  teamId: string | null;
  checkedInAt: string | null;
  createdAt: string;
}
